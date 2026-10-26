import { registerHooks } from 'node:module';
// Match the app bundler's extensionless local TypeScript imports for Node tests.
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.includes('/lib/') && specifier.startsWith('./') && !specifier.slice(2).includes('.')) return next(specifier+'.ts', context);
  return next(specifier, context);
} });
