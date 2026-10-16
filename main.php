<?php
	$url = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';
	if(isset($_GET['gene'])){
		$tmp = explode("=", $url);
		$gene = isset($tmp[1]) ? $tmp[1] : 'None'; 
	} else {
		$gene = "None";
	}
?>
