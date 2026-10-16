<?php
	ini_set('display_errors', '1');
	//echo 'Current PHP version: ' . phpversion();
	use PHPMailer\PHPMailer\PHPMailer;
	use PHPMailer\PHPMailer\Exception;
	
	/* Exception class. */
	require 'resources/PHPMailer/src/Exception.php';
	
	/* The main PHPMailer class. */
	require 'resources/PHPMailer/src/PHPMailer.php';
	
	/* SMTP class, needed if you want to use SMTP. */
	//require 'resources/PHPMailer/src/SMTP.php';
	
	//Create a new PHPMailer instance
	$mail = new PHPMailer;
	//Set who the message is to be sent from
	//$mail->setFrom('lyang@hms.harvard.edu', 'John Doe');
	$from_email = isset($_POST['from_email']) ? $_POST['from_email'] : '';
	$mail->setFrom($from_email);
	//Set an alternative reply-to address
	//$mail->addReplyTo('replyto@example.com', 'John Doe');
	$mail->addReplyTo($from_email);
	//Set who the message is to be sent to
	//$mail->addAddress('lyang@hms.harvard.edu', 'Liang Yang');
	$to_email = isset($_POST['to_email']) ? $_POST['to_email'] : '';
	$email_address = explode(",", str_replace(' ', '', $to_email));
	foreach($email_address as $email){
		$mail->addAddress($email);
	}
	
	$mail->isHTML(true);
	//Set the subject line
	$gene = isset($_POST['gene']) ? $_POST['gene'] : '';
	$mail->Subject = "ImmGen Gene Skyline plot for ".$gene;
	
	//Read an HTML message body from an external file, convert referenced images to embedded,
	//convert HTML into a basic plain-text alternative body
	//$mail->msgHTML(file_get_contents('contents.html'), __DIR__);
	$msg = isset($_POST['msg']) ? $_POST['msg'] : '';
	$mail->Body = '<p>'.$msg.'</p><br><img src="cid:image_cid" alt="image_cid">';
	//$mail->Body = '<img src="cid:image_cid" alt="image_cid">';
	//$mail->Body = $_POST['msg'];
	//Replace the plain text body with one created manually
	$mail->AltBody = 'This is a plain-text message body';
	//Attach an image file
	//$mail->addAttachment('images/RNAseqskylineheader.png');
	
	$imgdata = isset($_POST['imgdata']) ? $_POST['imgdata'] : '';
	$imagedata = base64_decode($imgdata);
	$filename = md5(uniqid(rand(), true));
	$file = 'tmp/'.$filename.'.png';
	file_put_contents($file,$imagedata);
	
	//$imageurl  = 'http://rstats.immgen.org/Skyline/tmp/'.$filename.'.png';
		
	$mail->addEmbeddedImage($file, "image_cid");
	//$mail->addEmbeddedImage('images/RNAseqskylineheader.png', "image_cid");
	//send the message, check for errors
	if (!$mail->send()) {
	    echo "Mailer Error: " . $mail->ErrorInfo;
	} else {
	    echo "Message sent!";
	}
?>