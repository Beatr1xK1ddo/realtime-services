import sqlQueries from "./sql-queries";

export type IAppType = typeof sqlQueries;

export type IAppTypeKeyes = keyof IAppType;
