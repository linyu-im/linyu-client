export enum ApplySourceEnum {
  Account = 'account',
  ECard = 'ecard',
  Phone = 'phone',
  Qrcode = 'qrcode',
  Search = 'search'
}

export function isApplySource(value: string): value is ApplySourceEnum {
  return (Object.values(ApplySourceEnum) as string[]).includes(value)
}

export enum ApplyStatusEnum {
  Wait = 'wait',
  Agree = 'agree',
  Cancel = 'cancel',
  Reject = 'reject'
}

export function isApplyStatus(value: string): value is ApplyStatusEnum {
  return (Object.values(ApplyStatusEnum) as string[]).includes(value)
}
