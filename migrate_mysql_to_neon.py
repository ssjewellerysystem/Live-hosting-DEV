import os
import pymysql
import psycopg2
from dotenv import load_dotenv

# Load local environment variables if available
load_dotenv()

print("----------------------------------------------------------------")
print("DEVELOPMENT UTILITY: MySQL to Neon PostgreSQL Migration Script")
print("----------------------------------------------------------------")

# =====================================
# Railway MySQL Connection (Environment-driven)
# =====================================
mysql_host = os.getenv("MIGRATION_MYSQL_HOST")
mysql_port = int(os.getenv("MIGRATION_MYSQL_PORT", 3306))
mysql_user = os.getenv("MIGRATION_MYSQL_USER")
mysql_password = os.getenv("MIGRATION_MYSQL_PASSWORD")
mysql_db = os.getenv("MIGRATION_MYSQL_DB")

if not all([mysql_host, mysql_user, mysql_password, mysql_db]):
    raise RuntimeError(
        "Missing one or more MySQL migration environment variables:\n"
        "- MIGRATION_MYSQL_HOST\n"
        "- MIGRATION_MYSQL_USER\n"
        "- MIGRATION_MYSQL_PASSWORD\n"
        "- MIGRATION_MYSQL_DB"
    )

mysql_conn = pymysql.connect(
    host=mysql_host,
    port=mysql_port,
    user=mysql_user,
    password=mysql_password,
    database=mysql_db,
    cursorclass=pymysql.cursors.DictCursor
)

# =====================================
# Neon PostgreSQL Connection (Environment-driven)
# =====================================
pg_uri = os.getenv("DATABASE_URI") or os.getenv("DATABASE_URL")
if not pg_uri:
    raise RuntimeError(
        "Missing target PostgreSQL connection URI in environment variables (DATABASE_URI or DATABASE_URL)."
    )

pg_conn = psycopg2.connect(pg_uri)

mysql_cur = mysql_conn.cursor()
pg_cur = pg_conn.cursor()

# Migration order is important because of foreign keys
tables = [
    "users",
    "categories",
    "products",
    "carts",
    "orders",
    "order_items"
]

for table in tables:
    print(f"\nMigrating {table}...")

    mysql_cur.execute(f"SELECT * FROM {table}")
    rows = mysql_cur.fetchall()

    if not rows:
        print(f"{table}: 0 rows")
        continue

    columns = list(rows[0].keys())
    col_names = ",".join(columns)

    placeholders = ",".join(["%s"] * len(columns))

    success_count = 0

    for row in rows:

        values = []

        for col in columns:
            value = row[col]

            # =====================================
            # USERS TABLE BOOLEAN CONVERSION
            # =====================================
            if table == "users":
                if col in [
                    "is_blocked",
                    "is_admin",
                    "email_verified",
                    "first_login"
                ]:
                    value = bool(value) if value is not None else None

            # =====================================
            # ORDERS TABLE BOOLEAN CONVERSION
            # =====================================
            if table == "orders":
                if col == "terms_accepted":
                    value = bool(value) if value is not None else None

            values.append(value)

        try:
            pg_cur.execute(
                f"""
                INSERT INTO {table}
                ({col_names})
                VALUES ({placeholders})
                """,
                values
            )

            success_count += 1

        except Exception as e:
            print(f"Error in {table}: {e}")
            pg_conn.rollback()

    pg_conn.commit()

    print(
        f"{table}: {success_count}/{len(rows)} rows migrated successfully"
    )

print("\nMigration completed!")

mysql_cur.close()
pg_cur.close()
mysql_conn.close()
pg_conn.close()