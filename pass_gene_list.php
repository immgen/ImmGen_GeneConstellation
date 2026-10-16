<?php
	$url = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';
	if(isset($_GET['genes'])){
		$tmp = explode("=", $url);
		$genes = isset($tmp[1]) ? $tmp[1] : 'None'; 
	} else {
		$genes = "None";
	}
?>
