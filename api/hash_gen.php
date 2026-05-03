<?php
require_once "cors.php";
echo password_hash('admin', PASSWORD_DEFAULT) . "\n";
echo password_hash('brgy', PASSWORD_DEFAULT) . "\n";
echo password_hash('resident', PASSWORD_DEFAULT) . "\n";
echo password_hash('coordinator', PASSWORD_DEFAULT) . "\n";
