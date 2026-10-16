<?php

	// Read a POST field; missing fields and anything other than a plain string (e.g. gene[]=...) become ''.
	function post_string($name) {
		return (isset($_POST[$name]) && is_string($_POST[$name])) ? $_POST[$name] : '';
	}

	// Database credentials live outside the web root, loaded the same way as in get_data.php.
	// Environment variables (e.g. Apache SetEnv) win; otherwise the PHP file named by GC_DB_CONFIG,
	// or ../config/db_config.php next to public/, is loaded.
	// That file must return array('host' => ..., 'user' => ..., 'pass' => ..., 'db' => ...).
	function env_value($name) {
		$value = getenv($name);
		if ($value === false && isset($_SERVER[$name])) { $value = $_SERVER[$name]; }
		return $value;
	}

	function load_db_config() {
		if (env_value('GC_DB_USER') !== false) {
			return array('host' => env_value('GC_DB_HOST'), 'user' => env_value('GC_DB_USER'), 'pass' => env_value('GC_DB_PASS'), 'db' => env_value('GC_DB_NAME'));
		}
		$config_file = env_value('GC_DB_CONFIG');
		if ($config_file === false || $config_file === '') { $config_file = dirname(__DIR__) . '/config/db_config.php'; }
		if (!is_readable($config_file)) { return null; }
		$config = include $config_file;
		return is_array($config) ? $config : null;
	}

	$gene = post_string('gene');
	$datagroup = post_string('datagroup');
	$populations = post_string('populations');
	$search_type = post_string('search_type');

	function get_ip_address(){
	    foreach (array('HTTP_CLIENT_IP', 'HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_FORWARDED', 'HTTP_X_CLUSTER_CLIENT_IP', 'HTTP_FORWARDED_FOR', 'HTTP_FORWARDED', 'HTTP_X_REAL_IP', 'REMOTE_ADDR') as $key){
	        if (array_key_exists($key, $_SERVER) === true && isset($_SERVER[$key])){
	            foreach (explode(',', $_SERVER[$key]) as $ip){
	                $ip = trim($ip); // just to be safe

	                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false){
	                    return $ip;
	                }
	            }
	        }
	    }
	    return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
	}
	$ip = get_ip_address();
	$hostname = (!empty($ip)) ? gethostbyaddr($ip) : '';
	if (!is_string($hostname)) { $hostname = ''; }

	$db_config = load_db_config();
	if ($db_config === null) {
		error_log('save_logs.php: no database configuration (set GC_DB_* env vars or create config/db_config.php outside the web root)');
		die("Can not connect.");
	}

	// Errors go to the PHP error log, never to the client.
	mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
	try {
		$con = mysqli_connect($db_config['host'], $db_config['user'], $db_config['pass'], $db_config['db']);
	} catch (mysqli_sql_exception $e) {
		error_log('save_logs.php: ' . $e->getMessage());
		die("Can not connect.");
	}

	$sql = "INSERT INTO `GeneConstellation_query_logs` (`query_gene`, `query_populations`, `datagroup`, `search_type`, `ip_address`, `host_name`) VALUES (?, ?, ?, ?, ?, ?)";

	try {
		$stmt = mysqli_prepare($con, $sql);
		mysqli_stmt_bind_param($stmt, 'ssssss', $gene, $populations, $datagroup, $search_type, $ip, $hostname);
		mysqli_stmt_execute($stmt);
		mysqli_stmt_close($stmt);
	} catch (mysqli_sql_exception $e) {
		error_log('save_logs.php: ' . $e->getMessage());
		die("Can not insert!");
	}
	mysqli_close($con);
?>
