use std::{
    collections::HashMap,
    path::Path,
    process::Stdio,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc,
    },
};

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    process::{Child, ChildStdin, Command},
    sync::{oneshot, Mutex},
};

use super::types::WorkEvent;

type RpcResult = Result<Value, String>;

pub struct AcpConnection {
    stdin: Mutex<ChildStdin>,
    child: Mutex<Child>,
    pending: Arc<Mutex<HashMap<u64, oneshot::Sender<RpcResult>>>>,
    inbound_ids: Arc<Mutex<HashMap<String, Value>>>,
    next_id: AtomicU64,
}

impl AcpConnection {
    pub async fn spawn(
        app: AppHandle,
        runtime_id: String,
        executable: &str,
        args: &[String],
        envs: &[(String, String)],
        working_dir: &Path,
    ) -> Result<Arc<Self>, String> {
        let mut command = if cfg!(windows)
            && matches!(
                std::path::Path::new(executable).extension().and_then(|value| value.to_str()),
                Some("cmd" | "bat")
            ) {
            let mut command = Command::new("cmd");
            command.arg("/C").arg(executable).args(args);
            command
        } else {
            let mut command = Command::new(executable);
            command.args(args);
            command
        };
        command
            .current_dir(working_dir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);
        super::process::hide_console_tokio(&mut command);
        for (key, value) in envs {
            command.env(key, value);
        }

        let mut child =
            command.spawn().map_err(|error| format!("WORK_RUNTIME_START_FAILED: {error}"))?;
        let stdin = child.stdin.take().ok_or("WORK_RUNTIME_STDIN_UNAVAILABLE")?;
        let stdout = child.stdout.take().ok_or("WORK_RUNTIME_STDOUT_UNAVAILABLE")?;
        let stderr = child.stderr.take().ok_or("WORK_RUNTIME_STDERR_UNAVAILABLE")?;
        let pending = Arc::new(Mutex::new(HashMap::<u64, oneshot::Sender<RpcResult>>::new()));
        let inbound_ids = Arc::new(Mutex::new(HashMap::new()));

        let connection = Arc::new(Self {
            stdin: Mutex::new(stdin),
            child: Mutex::new(child),
            pending: pending.clone(),
            inbound_ids: inbound_ids.clone(),
            next_id: AtomicU64::new(1),
        });

        let reader_app = app.clone();
        let reader_runtime = runtime_id.clone();
        tokio::spawn(async move {
            let mut lines = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let Ok(message) = serde_json::from_str::<Value>(&line) else {
                    let _ = reader_app.emit(
                        "work://event",
                        WorkEvent {
                            runtime_id: reader_runtime.clone(),
                            kind: "protocol_error".into(),
                            session_id: None,
                            request_id: None,
                            payload: json!({ "message": line }),
                        },
                    );
                    continue;
                };

                if let Some(id) = message.get("id").and_then(Value::as_u64) {
                    if message.get("result").is_some() || message.get("error").is_some() {
                        if let Some(sender) = pending.lock().await.remove(&id) {
                            let result = if let Some(error) = message.get("error") {
                                Err(error
                                    .get("message")
                                    .and_then(Value::as_str)
                                    .unwrap_or("ACP_ERROR")
                                    .to_string())
                            } else {
                                Ok(message.get("result").cloned().unwrap_or_else(|| json!({})))
                            };
                            let _ = sender.send(result);
                        }
                        continue;
                    }
                }

                let method = message.get("method").and_then(Value::as_str).unwrap_or_default();
                let params = message.get("params").cloned().unwrap_or_else(|| json!({}));
                if method == "session/request_permission" {
                    if let Some(id) = message.get("id") {
                        let request_id = id.to_string();
                        inbound_ids.lock().await.insert(request_id.clone(), id.clone());
                        let _ = reader_app.emit(
                            "work://event",
                            WorkEvent {
                                runtime_id: reader_runtime.clone(),
                                kind: "permission_request".into(),
                                session_id: params
                                    .get("sessionId")
                                    .and_then(Value::as_str)
                                    .map(str::to_string),
                                request_id: Some(request_id),
                                payload: params,
                            },
                        );
                    }
                } else if method == "session/update" {
                    let _ = reader_app.emit(
                        "work://event",
                        WorkEvent {
                            runtime_id: reader_runtime.clone(),
                            kind: "session_update".into(),
                            session_id: params
                                .get("sessionId")
                                .and_then(Value::as_str)
                                .map(str::to_string),
                            request_id: None,
                            payload: params.get("update").cloned().unwrap_or(params),
                        },
                    );
                }
            }
            let outstanding = {
                let mut requests = pending.lock().await;
                requests.drain().map(|(_, sender)| sender).collect::<Vec<_>>()
            };
            for sender in outstanding {
                let _ = sender.send(Err("WORK_RUNTIME_DISCONNECTED".into()));
            }
            let _ = reader_app.emit(
                "work://event",
                WorkEvent {
                    runtime_id: reader_runtime,
                    kind: "runtime_stopped".into(),
                    session_id: None,
                    request_id: None,
                    payload: json!({}),
                },
            );
        });

        tokio::spawn(async move {
            let mut lines = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = app.emit(
                    "work://event",
                    WorkEvent {
                        runtime_id: runtime_id.clone(),
                        kind: "runtime_log".into(),
                        session_id: None,
                        request_id: None,
                        payload: json!({ "message": line }),
                    },
                );
            }
        });

        connection
            .rpc(
                "initialize",
                json!({
                    "protocolVersion": 1,
                    "clientCapabilities": {},
                    "clientInfo": { "name": "Linyu Work", "version": env!("CARGO_PKG_VERSION") }
                }),
            )
            .await?;
        Ok(connection)
    }

    pub async fn rpc(
        &self,
        method: &str,
        params: Value,
    ) -> RpcResult {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);
        let (sender, receiver) = oneshot::channel();
        self.pending.lock().await.insert(id, sender);
        let message = json!({ "jsonrpc": "2.0", "id": id, "method": method, "params": params });
        if let Err(error) = self.write(&message).await {
            self.pending.lock().await.remove(&id);
            return Err(error);
        }
        receiver.await.map_err(|_| "WORK_RUNTIME_DISCONNECTED".to_string())?
    }

    pub async fn notify(
        &self,
        method: &str,
        params: Value,
    ) -> Result<(), String> {
        self.write(&json!({ "jsonrpc": "2.0", "method": method, "params": params })).await
    }

    pub async fn resolve_permission(
        &self,
        request_id: &str,
        option_id: Option<&str>,
    ) -> Result<(), String> {
        let id =
            self.inbound_ids.lock().await.remove(request_id).ok_or("WORK_PERMISSION_NOT_FOUND")?;
        let outcome = option_id.map_or_else(
            || json!({ "outcome": "cancelled" }),
            |value| json!({ "outcome": "selected", "optionId": value }),
        );
        self.write(&json!({ "jsonrpc": "2.0", "id": id, "result": { "outcome": outcome } })).await
    }

    pub async fn stop(&self) -> Result<(), String> {
        self.child.lock().await.kill().await.map_err(|error| error.to_string())
    }

    async fn write(
        &self,
        value: &Value,
    ) -> Result<(), String> {
        let mut stdin = self.stdin.lock().await;
        let mut line = serde_json::to_vec(value).map_err(|error| error.to_string())?;
        line.push(b'\n');
        stdin.write_all(&line).await.map_err(|error| error.to_string())?;
        stdin.flush().await.map_err(|error| error.to_string())
    }
}
