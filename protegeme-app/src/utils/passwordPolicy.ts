/**
 * ISO 27001 password policy validator.
 * Rules:
 *  - Minimum 12 characters
 *  - At least 1 uppercase letter (A-Z)
 *  - At least 1 lowercase letter (a-z)
 *  - At least 1 digit (0-9)
 *  - At least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
 */

export const PASSWORD_HINT =
  'Mínimo 12 caracteres, con mayúscula, minúscula, número y carácter especial (!@#$%^&*…)'

export function validatePassword(password: string): string {
  if (!password || password.length < 12)
    return 'La contraseña debe tener al menos 12 caracteres'
  if (!/[A-Z]/.test(password))
    return 'La contraseña debe incluir al menos una letra mayúscula'
  if (!/[a-z]/.test(password))
    return 'La contraseña debe incluir al menos una letra minúscula'
  if (!/[0-9]/.test(password))
    return 'La contraseña debe incluir al menos un número'
  if (!/[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/.test(password))
    return 'La contraseña debe incluir al menos un carácter especial (!@#$%^&*…)'
  return ''
}
