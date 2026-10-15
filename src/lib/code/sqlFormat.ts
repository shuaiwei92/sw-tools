import { format as sqlFmt } from 'sql-formatter';

/** sql-formatter 支持的方言（取其子集，覆盖常见数据库）。 */
export const SQL_DIALECTS = [
  { id: 'sql', name: '标准 SQL' },
  { id: 'mysql', name: 'MySQL / MariaDB' },
  { id: 'postgresql', name: 'PostgreSQL' },
  { id: 'sqlite', name: 'SQLite' },
  { id: 'tsql', name: 'SQL Server (T-SQL)' },
  { id: 'plsql', name: 'Oracle (PL/SQL)' },
  { id: 'db2', name: 'DB2' },
  { id: 'hive', name: 'Hive' },
  { id: 'bigquery', name: 'BigQuery' },
  { id: 'snowflake', name: 'Snowflake' },
] as const;

export type SqlDialect = (typeof SQL_DIALECTS)[number]['id'];

export interface FormatSqlOptions {
  dialect?: SqlDialect;
  /** 缩进字符串，默认两个空格 */
  indent?: string;
  /** 关键字大小写 */
  keywordCase?: 'upper' | 'lower' | 'preserve';
}

/** 格式化 SQL；输入为空返回空串；语法错误时抛出（由页面捕获展示）。 */
export function formatSql(sql: string, opts: FormatSqlOptions = {}): string {
  const { dialect = 'sql', indent = '  ', keywordCase = 'upper' } = opts;
  if (!sql.trim()) return '';
  return sqlFmt(sql, {
    language: dialect,
    indent,
    keywordCase,
    linesBetweenQueries: 1,
  });
}
