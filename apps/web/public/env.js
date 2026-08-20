/* Deployment config hook. In dev this file is empty — core/env.ts falls back
   to the compose-stack defaults. In containers, the entrypoint overwrites it
   from environment variables, so one built bundle serves every environment. */
window.__env = {};
