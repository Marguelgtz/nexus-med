/** Prevent the Prisma D1 adapter from logging raw database errors.
 * Its current onError implementation logs the original D1 exception before
 * translating it. Keep standard constraint categories for Prisma while never
 * passing through the original message, stack, cause, SQL or bound values.
 * The application's explicit atomic D1 batches use the original binding. */
function safeD1Error(error: unknown): Error {
  const message = error instanceof Error ? error.message : '';
  const categories = [
    'UNIQUE constraint failed', 'PRIMARY KEY constraint failed',
    'NOT NULL constraint failed', 'FOREIGN KEY constraint failed',
    'CHECK constraint failed', 'no such table', 'no such column',
  ];
  const d1Message = message.split('D1_ERROR: ').at(1) ?? message;
  const driverMessage = d1Message.split('SqliteError: ').at(1) ?? d1Message;
  const category = categories.find(value => driverMessage.startsWith(value));
  return new Error(`D1_ERROR: ${category ?? 'database operation failed'}`);
}

/** Only the prepare/bind/run/raw and exec paths used by Prisma are wrapped.
 * Bind methods to their native receiver; D1 objects may require internal slots. */
export function safeD1ForPrisma<T extends object>(database: T): T {
  function statementProxy<S extends object>(statement: S): S {
    return new Proxy(statement, {
      get(target, property) {
        const value: unknown = Reflect.get(target, property, target);
        if (typeof value !== 'function') return value;
        if (property === 'bind') return (...args: unknown[]) => {
          try { return statementProxy(Reflect.apply(value, target, args) as object); }
          catch (error) { throw safeD1Error(error); }
        };
        if (property === 'run' || property === 'raw') return (...args: unknown[]) => {
          try { return Promise.resolve(Reflect.apply(value, target, args)).catch(error => { throw safeD1Error(error); }); }
          catch (error) { throw safeD1Error(error); }
        };
        return value.bind(target);
      },
    });
  }
  return new Proxy(database, {
    get(target, property) {
      const value: unknown = Reflect.get(target, property, target);
      if (typeof value !== 'function') return value;
      if (property === 'prepare') return (...args: unknown[]) => {
        try { return statementProxy(Reflect.apply(value, target, args) as object); }
        catch (error) { throw safeD1Error(error); }
      };
      if (property === 'exec') return (...args: unknown[]) => {
        try { return Promise.resolve(Reflect.apply(value, target, args)).catch(error => { throw safeD1Error(error); }); }
        catch (error) { throw safeD1Error(error); }
      };
      return value.bind(target);
    },
  });
}
