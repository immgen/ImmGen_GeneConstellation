<?php
	session_start ();

	// Reject the request with a JSON error body and stop.
	function reject_request($status, $message) {
		http_response_code($status);
		header('Content-Type: application/json');
		echo json_encode(array('error' => $message));
		exit;
	}

	// Read a POST field; anything other than a plain string (e.g. genesymbol[]=...) is rejected.
	function post_string($name) {
		if (!isset($_POST[$name])) { return ''; }
		if (!is_string($_POST[$name])) { reject_request(400, "Invalid parameter: $name"); }
		return $_POST[$name];
	}

	// Database credentials live outside the web root. Environment variables (e.g. Apache SetEnv) win;
	// otherwise the PHP file named by GC_DB_CONFIG, or ../config/db_config.php next to public/, is loaded.
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

	// Prepared statements return INT/FLOAT/DOUBLE columns as native PHP numbers, while the old
	// mysqli_query() calls returned every column as a string. Convert back so the JSON is unchanged.
	function float_to_text($v) {
		if ($v == 0) { return '0'; }
		if (!is_finite($v)) { return (string) $v; }
		// Shortest mantissa that round-trips to the same double.
		for ($p = 0; $p <= 16; $p++) {
			$s = sprintf('%.' . $p . 'e', $v);
			if ((float) $s == $v) { break; }
		}
		if (!preg_match('/^(-?)(\d)(?:\.(\d*))?e([+-]?\d+)$/i', $s, $m)) { return $s; }
		$sign = $m[1];
		$digits = rtrim($m[2] . (isset($m[3]) ? $m[3] : ''), '0');
		if ($digits === '') { $digits = '0'; }
		$exp = intval($m[4]);
		if ($exp < -6 || $exp >= 15) {
			return $sign . $digits[0] . (strlen($digits) > 1 ? '.' . substr($digits, 1) : '') . 'e' . $exp;
		}
		if ($exp < 0) {
			return $sign . '0.' . str_repeat('0', -$exp - 1) . $digits;
		}
		$int_part = substr(str_pad($digits, $exp + 1, '0'), 0, $exp + 1);
		$frac_part = substr($digits, $exp + 1);
		return $sign . $int_part . ($frac_part !== '' && $frac_part !== false ? '.' . $frac_part : '');
	}

	function fetch_text_row($result, $mode) {
		$row = mysqli_fetch_array($result, $mode);
		if (!is_array($row)) { return null; }
		foreach ($row as $k => $v) {
			if (is_int($v)) { $row[$k] = (string) $v; }
			else if (is_float($v)) { $row[$k] = float_to_text($v); }
		}
		return $row;
	}

	// Run a query with every user-supplied value bound as a string parameter; returns a buffered mysqli_result.
	function run_query($con, $sql, $params) {
		$stmt = mysqli_prepare($con, $sql);
		if (count($params) > 0) {
			mysqli_stmt_bind_param($stmt, str_repeat('s', count($params)), ...$params);
		}
		mysqli_stmt_execute($stmt);
		$result = mysqli_stmt_get_result($stmt);
		mysqli_stmt_close($stmt);
		return $result;
	}

	$genesymbol = post_string('genesymbol');
	$datagroup = post_string('datagroup');
	$population = post_string('population');
	$arrange_option = post_string('arrange_option');
	$cor_option = post_string('cor_option');

	$immgen_data_group = 'ImmGen_data_group_20191122';
	$immgen_data_group_global = 'ImmGen_data_group_maximum_20191122';

	$rnaseq_meta_table = 'ImmGen_RNAseq_meta_info_20200610';
	$rnaseq_kegg_table = 'ImmGen_RNAseq_meta_info_Entrez2KEGG';
	$rnaseq_orthology_table = 'ImmGen_RNAseq_meta_info_Human_Ortholog_20220121';
	$rnaseq_go_table = 'ImmGen_RNAseq_meta_info_GO_20200610';
	$rnaseq_biolegend_table = 'ImmGen_RNAseq_meta_info_BioLegend';

	$key_pop_info = array('LTHSC_34-_BM','MMP2_150+48+_BM','proB_CLP_BM','proB_FrBC_BM','B_Fo_Sp','B_MZ_Sp','B_GC_CC_Sp','B_PC_Sp','B1b_PC','preT_DN1_Th','T_DP_Th','T_4_Nve_Sp','NKT_Sp','Treg_4_25hi_Sp','T_8_Nve_Sp','T8_TE_LCMV_d7_Sp','T8_Tem_LCMV_d180_Sp','Tgd_g2+d1_24a+_Th','Tgd_g2+d17_LN','Tgd_Sp','NK_27-11b+_Sp','ILC2_SI','ILC3_NKp46-CCR6-_SI','ILC3_NKp46+_SI','Mo_6C+II-_Bl','DC_8+_Sp','DC_pDC_Sp','GN_BM','GN_Thio_PC','MC_heparinase_PC','MF_PC','MF_RP_Sp','MF_microglia_CNS','MF_Alv_Lu','Ep_MEChi_Th','LEC_SLN','IAP_SLN');
	$B_pop_info = array("proB_CLP_BM","proB_FrA_BM","proB_FrBC_BM","B_FrE_BM","B_T1_Sp","B_T2_Sp","B_T3_Sp","B_Sp","B_Fem_Sp","B_Fo_Sp","B_MZ_Sp","B_mem_Sp","B_GC_CC_Sp","B_GC_CB_Sp","B_PB_Sp","B_PC_Sp","B_PC_BM","B1b_PC");
	$T_pop_info = array("preT_DN1_Th","preT_DN2a_Th","preT_DN2b_Th","preT_DN3_Th","T_DN4_Th","T_ISP_Th","T_DP_Th","T_4_Th","T_4_Nve_Sp","T_4_Nve_Fem_Sp","T_4_Sp_aCD3+CD40_18hr","T_8_Th","T_8_Nve_Sp","T8_TN_P14_Sp","T8_TE_LCMV_d7_Sp","T8_MP_LCMV_d7_Sp","T8_IEL_LCMV_d7_Gut","T8_Tcm_LCMV_d180_Sp","T8_Tem_LCMV_d180_Sp","Treg_4_25hi_Sp","Treg_4_FP3+_Nrplo_Co","NKT_Sp","NKT_Sp_LPS_3hr","NKT_Sp_LPS_18hr","NKT_Sp_LPS_3d","NKT_19-8-TCRb+CD1daGalCerTet+_Lu","NKT_19-8-TCRb+CD1daGalCerTet+_Sp","NKT_19-8-TCRb+CD1daGalCerTet+_Th","NKT_19-8-TCRb+CD1daGalCerTet+_Lv","T_4_19-8-TCRb+_Sp","Tgd_g2+d17_24a+_Th","Tgd_g2+d1_24a+_Th","Tgd_g1_1+d1_24a+_Th","Tgd_g2+d17_LN","Tgd_g2+d1_LN","Tgd_g1_1+d1_LN","Tgd_Sp");
	$MNP_pop_info = array("DC_8+_Sp","DC_4+_Sp","DC_pDC_Sp","MF_PC","MF_Fem_PC","MF_226+II+480lo_PC","MF_102+480+_PC","MF_RP_Sp","MF_Alv_Lu","MF_pIC_Alv_Lu","MF_microglia_CNS","MF_AT","Mo_6C+II-_Bl","Mo_6C-II-_Bl");
	$key_pop_info_OSMNP = array('MF_64pLYVEpIIp_Ao','MF_E10_5_YS','DC_24p8anXCR1n_Sp','DC_XCR1nSIRPap_Th','MF_115pICAM2p226n6Cn_PC','Mo_6Cp_Bl','MF_E16_5_PC','MF_KC_Clec4FpTim4p64p_Lv','MF_11cpSigFp_BAL','Mo_6Cp_Lu','MF_CCR2p64p6ClonGFPp_Ht','MF_45lo_CNS','MF_microglia_CNS','DC_8ap_PP','MF_DRG','MF_B220n6Cn64pTim4p_PC');
	$DC_pop_info_OSMNP = array("DC_24p8apXCR1n_Sp","DC_24p8apXCR1p_Sp","DC_24p8anXCR1n_Sp","DC_24p8anXCR1p_Sp","DC_SigHn_64n11chipBst2n11bp8anRFPn_Sp","DC_SigHn_64n11chipBst2n11bp8anRFPp_Sp","DC_XCR1pSIRPan_Th","DC_XCR1nSIRPap_Th","DC_pDC_DN_BM","DC_pDC_DN_Sp","DC_pDC_DP_BM","DC_pDC_SigHp6Cn_BM","DC_pDC_SigHn6Cp_BM","DC_pDC_SigHn6Cp_Sp","DC_cDC1_XCR1p_Lv","DC_cDC2_172ap_Lv","DC_pDC_120g8p11cintp6Cp_Lv","DC_103p11bnsiglecFn_Lu","DC_103n11bpsiglecFn_Lu","DC_8p4n_Sp","DC_mig_103p_LuLN","DC_mig_11bp_LuLN","DC_res_11bp_LuLN","DC_res_8p_LuLN","DC_8ap_MLN","DC_8ap_PP","DC_8an103p11bn_MLN","DC_8an103p11bn_PP","DC_8an103p_MLN","DC_8an103p_PP","DC_8an103n_MLN","DC_8an103n_PP");
	$MF_pop_info_OSMNP = array("MF_64pLYVEpIIn_Ao","MF_64pLYVEpIIp_Ao","MF_64pLYVEnIIp_Ao","MF_PC","MF_F_PC","MF_E10_5_YS","MF_d6_EB","MF_d8_EB","MF_64p_Th","MF_115pICAM2p226n6Cn_PC","MF_115p36p6ClopICAM2n226n_Thio_72h_PC","MF_115p36p6ClopICAM2n226n_Thio_24h_PC","MF_64p6Cn6Gn_E14_5_Kd","MF_64p6Cn6Gn_E14_5_Lu","MF_64p6Cn6Gn_E16_5_Kd","MF_64p6Cn6Gn_E16_5_Lu","MF_64p6Cn6Gn_E18_5_Br","MF_64p6Cn6Gn_E18_5_Co","MF_64p6Cn6Gn_E18_5_Dr","MF_64p6Cn6Gn_E18_5_Ep","MF_64p6Cn6Gn_E18_5_F_Ht","MF_64p6Cn6Gn_E18_5_Kd","MF_64p6Cn6Gn_E18_5_Lv","MF_64p6Cn6Gn_E18_5_PC","MF_64p6Cn6Gn_E18_5_Sp","MF_64p6Cn6Gn_E18_5_Thy","MF_64p6Cn6Gn_Kd_Neo","MF_64p6Cn6Gn_Lu_Neo","MF_E14_5_F_PC","MF_E16_5_PC","MF_E18_5_F_PC","MF_PC_F_Neo","MF_KC_Clec4FpTim4p64p_APAP_12h_Lv","MF_KC_Clec4FpTim4p64p_APAP_36h_Lv","MF_KC_Clec4FpTim4p64p_Lv","MF_KC_Clec4FpTim4p64p_PBS_Lv","MF_11cpSigFp_BAL","MF_11cpSigFp_LPS_d6_BAL","MF_64p6Cn206pIIn_LPS_d3_Lu","MF_64p6Cn206pIIn_LPS_d6_Lu","MF_64p6Cn206pIIn_Lu","MF_64p6Cn206pIIp_LPS_d3_Lu","MF_64p6Cn206pIIp_LPS_d6_Lu","MF_64p6Cn206nIIp_LPS_d3_Lu","MF_64p6Cn206nIIp_LPS_d6_Lu","MF_64p6Cn206nIIp_Lu","MF_SSChipSigFn_LPS_d3_BAL","MF_SSChipSigFn_LPS_d6_BAL","MF_CCR2p64p6ClonGFPp_Ht","MF_CCR2p64p6ClonGFPp_inj_d2_Ht","MF_CCR2p64p6ClonGFPp_inj_d4_Ht","MF_CCR2nFlt3n64p6ClonGFPntdTomaton_Ht","MF_CCR2nFlt3n64p6ClonGFPntdTomaton_inj_d2_Ht","MF_CCR2nFlt3n64p6ClonGFPntdTomatop_Ht","MF_11blop64p169p_Calb_48h_Lv","MF_11blop64p169p_Calb_8h_Lv","MF_11blop64p169p_Lv","MF_45lo_Calb_48h_CNS","MF_45lo_Calb_8h_CNS","MF_45lo_CNS","MF_6Gn480hi_Calb_48h_Kd","MF_6Gn480hi_Calb_8h_Kd","MF_6Gn480hi_Kd","MF_alv_6GnSigFp11cp_Lu","MF_microglia_cerebel_CNS","MF_microglia_cerebr_CNS","MF_pIC_alv_siglecFp_Lu","MF_226pIIp_PC","MF_226pIIp480lo_PC","MF_480p_SP","MF_480p64pMerTKp_WAT","MF_480p64pLyve1p_MS","MF_480p64pMerTKp_AT","MF_480p64pMerTKp_MAT","MF_64pMerTKp11blo_Sp","MF_alv_11cp64pSiglecFp_Lu","MF_DRG","MF_microglia_CNS","MF_SN","MF_B220n6Cn64pTim4n_PC","MF_B220n6Cn64pTim4p_PC","MG_cerebel","MG_cortex","MG_hippo","MG_SC");
	$Mo_pop_info_OSMNP = array("Mo_115p6Cp36lopICAM2n226n_Thio_24h_PC","Mo_115pICAM2n226n6Cn_Thio_4h_PC","Mo_115pICAM2n226n6Cn_Thio_8h_PC","Mo_6Cp_Bl","Mo_6Cp_Thio_24h_BI","Mo_6Cp_Thio_72h_BI","Mo_6CpThio_4h_BI","Mo_6CpThio_8h_BI","Mo_6Chi11bp_APAP_12h_Lv","Mo_6Chi11bp_APAP_36h_Lv","Mo_6Chi11bp_PBS_Lv","Mo_6Cint11cint_APAP_36h_Lv","Mo_64p6CpIIp_LPS_d3_Lu","Mo_64p6CpIIp_LPS_d6_Lu","Mo_6Cp_Lu","Mo_SSClop6Cp_LPS_d3_BAL","Mo_64p6ChinGFPp_inj_d2_Ht","Mo_64p6ChinGFPp_inj_d4_Ht","Mo_6Cn_Bl","Mo_6Cn_Lu");

	// Whitelist: datagroup => tables plus, per population option, the correlation-table group and the expression columns.
	$datagroups = array(
		'ImmGen ULI RNASeq' => array(
			'cor_table' => 'GeneConstellation_ULI_RNAseq_20200610',
			'expr_table' => 'ImmGen_ATAC_ULI_RNAseq_expr_20200610',
			'populations' => array(
				'Reference populations' => array('Key Populations', $key_pop_info),
				'B Cells' => array('B Cells', $B_pop_info),
				'T Cells' => array('T Cells', $T_pop_info),
				'Myeloid Cells' => array('MNP Cells', $MNP_pop_info),
			),
		),
		'ImmGen MNP OpenSource' => array(
			'cor_table' => 'GeneConstellation_OSMNP_20200610',
			'expr_table' => 'ImmGen_OSMNP_ULI_RNAseq_expr_20200610',
			'populations' => array(
				'Reference populations' => array('Key Populations', $key_pop_info_OSMNP),
				'Dendritic Cells' => array('Dendritic Cells', $DC_pop_info_OSMNP),
				'Macrophages' => array('Macrophages', $MF_pop_info_OSMNP),
				'Monocytes' => array('Monocytes', $Mo_pop_info_OSMNP),
			),
		),
	);
	$arrange_options = array('secondary_correlation', 'gene_location');

	if (!array_key_exists($datagroup, $datagroups)) { reject_request(400, 'Invalid datagroup'); }
	if (!array_key_exists($population, $datagroups[$datagroup]['populations'])) { reject_request(400, 'Invalid population'); }
	if (!in_array($arrange_option, $arrange_options, true)) { reject_request(400, 'Invalid arrange_option'); }

	$rnaseq_cor_table = $datagroups[$datagroup]['cor_table'];
	$rnaseq_table = $datagroups[$datagroup]['expr_table'];
	list($cor_group, $popnames) = $datagroups[$datagroup]['populations'][$population];

	// Only server-side constants are concatenated below; genesymbol, cor_option and the group are bound parameters.
	$expr_columns = "e.`".implode("`, e.`",$popnames)."`";
	$rnaseq_query_gene_expr_query = "SELECT e.Gene_Symbol, ".$expr_columns." FROM ".$rnaseq_table." AS e WHERE e.Gene_Symbol = ?";
	$rnaseq_expr_query = "SELECT e.Gene_Symbol, ".$expr_columns." FROM ".$rnaseq_table." AS e LEFT JOIN ".$rnaseq_cor_table." As c ON e.Gene_Symbol = c.target_gene WHERE c.`group` = ? AND c.`primary_gene` = ? AND c.`sign` = ?";
	if($arrange_option == 'secondary_correlation'){
		$rnaseq_cor_query = "SELECT * FROM ".$rnaseq_cor_table." WHERE `group` = ? AND `primary_gene` = ? AND `sign` = ?";
	} else {
		$rnaseq_cor_query = "SELECT t.*, m.Chr, m.Start, m.End FROM ".$rnaseq_cor_table." AS t, ".$rnaseq_meta_table." AS m WHERE t.`group` = ? AND t.`primary_gene` = ? AND t.`target_gene` = m.`Gene_Symbol` AND t.`sign` = ?";
	}

	$rnaseq_meta_query = "SELECT * FROM ".$rnaseq_meta_table." WHERE Gene_Symbol = ?";
	$rnaseq_kegg_query = "SELECT k.* FROM ".$rnaseq_kegg_table." AS k, ".$rnaseq_meta_table." AS m WHERE m.Gene_Symbol = ? AND m.Entrez_Gene_ID = k.Entrez_Gene_ID";
	$rnaseq_go_query = "SELECT distinct(g.GO_ID), g.Category, g.GO_Name FROM ".$rnaseq_go_table." AS g, ".$rnaseq_meta_table." AS m WHERE m.Gene_Symbol = ? AND m.MGI_ID = g.MGI_ID ORDER BY g.Category DESC, g.GO_ID ASC";
	$rnaseq_orthology_query = "SELECT o.* FROM ".$rnaseq_orthology_table." AS o, ".$rnaseq_meta_table." AS m WHERE m.Gene_Symbol = ? AND m.MGI_ID = o.MGI_ID";
	$rnaseq_biolegend_query = "SELECT b.* FROM ".$rnaseq_biolegend_table." AS b, ".$rnaseq_orthology_table." AS o, ".$rnaseq_meta_table." AS m WHERE m.Gene_Symbol = ? AND m.MGI_ID = o.MGI_ID AND o.Human_EntrezID = b.Human_EntrezID";

	$db_config = load_db_config();
	if ($db_config === null) {
		error_log('get_data.php: no database configuration (set GC_DB_* env vars or create config/db_config.php outside the web root)');
		reject_request(500, 'Can not connect.');
	}

	mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
	try {
		$con = mysqli_connect($db_config['host'], $db_config['user'], $db_config['pass'], $db_config['db']);

		$rnaseq_cor_result = run_query($con, $rnaseq_cor_query, array($cor_group, $genesymbol, $cor_option));
		$rnaseq_query_gene_expr_result = run_query($con, $rnaseq_query_gene_expr_query, array($genesymbol));
		$rnaseq_expr_result = run_query($con, $rnaseq_expr_query, array($cor_group, $genesymbol, $cor_option));
		$rnaseq_meta_result = run_query($con, $rnaseq_meta_query, array($genesymbol));
		$rnaseq_kegg_result = run_query($con, $rnaseq_kegg_query, array($genesymbol));
		$rnaseq_go_result = run_query($con, $rnaseq_go_query, array($genesymbol));
		$rnaseq_orthology_result = run_query($con, $rnaseq_orthology_query, array($genesymbol));
		$rnaseq_biolegend_result = run_query($con, $rnaseq_biolegend_query, array($genesymbol));
	} catch (mysqli_sql_exception $e) {
		error_log('get_data.php: ' . $e->getMessage());
		reject_request(500, 'Can not connect.');
	}

	$json = array();
	$min_cor = 1;
	while ($r = fetch_text_row($rnaseq_cor_result, MYSQLI_NUM)) {
		if($arrange_option == 'secondary_correlation'){
			if (isset($r[2]) && isset($r[3])) {
				array_push($json, array('axis' => $r[2], 'value' => floatval($r[3])));
			}
		} else if($arrange_option == 'gene_location'){
			if (isset($r[2]) && isset($r[3]) && isset($r[6]) && isset($r[7]) && isset($r[8])) {
				array_push($json, array('axis' => $r[2], 'value' => floatval($r[3]), 'chr' => $r[6], 'start' => intval($r[7]), 'end' => intval($r[8])));
			}
		}
		if(isset($r[3]) && abs(floatval($r[3])) < $min_cor) { $min_cor = abs(floatval($r[3])); }
	}

	$query_expr = array();
	while ($r1 = fetch_text_row($rnaseq_query_gene_expr_result, MYSQLI_ASSOC)) {
		$name = $r1['Gene_Symbol'];
		unset($r1['Gene_Symbol']);
		array_push($query_expr, array('name' => $name, 'values' => array_map(function ($val) {return $val - 0.1 + 1;}, array_map('floatval', array_values($r1)))));
	}

	$expr = array();
	while ($r2 = fetch_text_row($rnaseq_expr_result, MYSQLI_ASSOC)) {
		$name = $r2['Gene_Symbol'];
		unset($r2['Gene_Symbol']);
		array_push($expr, array('name' => $name, 'values' => array_map(function ($val) {return $val - 0.1 + 1;}, array_map('floatval', array_values($r2)))));
	}

	$rnaseq_meta = fetch_text_row($rnaseq_meta_result, MYSQLI_ASSOC);

	$kegg = array();
	while ($r3 = fetch_text_row($rnaseq_kegg_result, MYSQLI_NUM)) {
		if (isset($r3[1]) && isset($r3[2])) {
			array_push($kegg, array('kegg_id' => $r3[1], 'kegg_name' => $r3[2]));
		}
	}

	$go = array();
	while ($r4 = fetch_text_row($rnaseq_go_result, MYSQLI_NUM)) {
		if (isset($r4[0]) && isset($r4[1]) && isset($r4[2])) {
			array_push($go, array('go_id' => $r4[0], 'go_category' => $r4[1], 'go_name' => $r4[2]));
		}
	}

	if(mysqli_num_rows($rnaseq_orthology_result) > 0) { $orthology = fetch_text_row($rnaseq_orthology_result, MYSQLI_ASSOC); } else { $orthology = 'None'; }
	if(mysqli_num_rows($rnaseq_biolegend_result) > 0) { $biolegend = fetch_text_row($rnaseq_biolegend_result, MYSQLI_ASSOC); } else { $biolegend = 'None'; }

	mysqli_close($con);

	$output = array('data'=>array($json), 'query_expr'=>$query_expr, 'expr'=>$expr, 'popnames'=>$popnames, 'min_cor'=>$min_cor, 'meta'=>$rnaseq_meta, 'kegg'=>$kegg, 'go'=>$go, 'orthology'=>$orthology, 'biolegend'=>$biolegend);

	echo json_encode($output);

?>
