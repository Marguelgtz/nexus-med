import { currentPrincipal } from '../domains/auth/auth.context';
import { ConflictError, ValidationError } from './http/errors';

export function checkVersion(expected: number | undefined, actual: number): void {
  if (currentPrincipal() && expected === undefined) {
    throw new ValidationError('Actualiza el registro antes de guardar. Falta la versión del formulario.');
  }
  if (expected !== undefined && expected !== actual) {
    throw new ConflictError('Otra persona modificó este registro. Conserva tus cambios y actualiza antes de guardar.');
  }
}
