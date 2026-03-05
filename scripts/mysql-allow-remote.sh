#!/bin/sh
# Allow MySQL user 'altv' to connect from any host (fixes "Host 'x.x.x.x' is not allowed")
# Usage: ./scripts/mysql-allow-remote.sh [root_password]
# Default root password from .env is often 'root'. If you get "Access denied", pass your actual root password:
#   ./scripts/mysql-allow-remote.sh your_root_password

ROOT_PWD="${1:-root}"

docker exec -e MYSQL_PWD="$ROOT_PWD" altv-mysql mysql -uroot -e "
CREATE USER IF NOT EXISTS 'altv'@'%' IDENTIFIED BY 'altv';
GRANT ALL PRIVILEGES ON altv.* TO 'altv'@'%';
FLUSH PRIVILEGES;
SELECT user, host FROM mysql.user WHERE user IN ('root','altv');
" && echo "Done. altv can now connect from any host."
