# MySQL – altv user and tables

## See tables as `altv` user

The `altv` user only has access to the **`altv`** database. You must use that database or you will see no tables.

- **In your MySQL client (TablePlus, DBeaver, etc.):** set the default database to **`altv`** in the connection settings, or after connecting run:
  ```sql
  USE altv;
  SHOW TABLES;
  ```
- **Command line:**
  ```bash
  docker exec -e MYSQL_PWD=altv altv-mysql mysql -ualtv altv -e "SHOW TABLES;"
  ```
  The **`altv`** after `-ualtv` is the database name.

Tables: **players** (name, money), **config** (key, value).
