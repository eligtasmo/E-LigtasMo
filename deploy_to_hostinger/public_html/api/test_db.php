<?php
$mysqli = new mysqli("localhost", "root", "");
if ($mysqli->connect_error) {
    die("Connect Error (" . $mysqli->connect_errno . ") " . $mysqli->connect_error);
}
echo "Connected successfully to MySQL via mysqli\n";
$mysqli->close();
?>
