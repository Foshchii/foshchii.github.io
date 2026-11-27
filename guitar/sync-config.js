// Where synced progress is kept: a Supabase project with the table and functions in
// sync-api/schema.sql (see sync-api/README.md). The key is the project's publishable key, which
// is meant to be public. With url left empty, the sync screen says sync is not set up here.
export const syncConfig = {
  url: "",
  key: ""
};
