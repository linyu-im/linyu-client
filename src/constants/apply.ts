export enum ApplySourceEnum {
  Account = 'account',
  ECard = 'ecard',
  Phone = 'phone',
  Qrcode = 'qrcode'
}

export function isApplySource(value: string): value is ApplySourceEnum {
  return (Object.values(ApplySourceEnum) as string[]).includes(value)
}
