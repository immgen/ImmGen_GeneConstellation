//function RadarChart(id, data, options, arrange_option, filter_option) {
function RadarChart(id, data, options, arrange_option) {
	var cfg = {
	 w: 600,				//Width of the circle
	 h: 850,				//Height of the circle
	 margin: {top: 20, right: 20, bottom: 20, left: 20}, //The margins of the SVG
	 //levels: 3,				//How many levels or inner circles should there be drawn
	 zoom_cutoff: 0.3, 			//What is the value that the biggest circle will represent
	 labelFactor: 1.07, 	//How much farther than the radius of the outer circle should the labels be placed
	 wrapWidth: 60, 		//The number of pixels after which a label needs to be given a new line
	 opacityArea: 0.35, 	//The opacity of the area of the blob
	 dotRadius: 9, 			//The size of the colored circles of each blog
	 opacityCircles: 0.1, 	//The opacity of the circles of each blob
	 strokeWidth: 2, 		//The width of the stroke around each blob
	 //strokeColor: '#778899',	//The color of the stroke around each blob
	 strokeColor: '#FFFAFA',	//The color of the stroke around each blob
	 roundStrokes: false,	//If true the area and stroke will follow a round path (cardinal-closed)
	 color: '#6495ED',	//Color function
	 color_negative: '#3CB371'
	};
	
	//Put all of the options into a variable called cfg
	if('undefined' !== typeof options){
	  for(var i in options){
		if('undefined' !== typeof options[i]){ cfg[i] = options[i]; }
	  }//for i
	}//if
	
	//If the supplied maxValue is smaller than the actual one, replace by the max in the data
	//var maxValue = Math.max(cfg.maxValue, d3.max(data, function(i){return d3.max(i.map(function(o){return Math.abs(o.value);}))}));
	var maxValue = 1 - cfg.zoom_cutoff;
	if(cfg.zoom_cutoff >= 0.99) { cfg.levels = 1; } else if(cfg.zoom_cutoff >= 0.8) { cfg.levels = 2; } else { cfg.levels = Math.floor((1-cfg.zoom_cutoff)*10); }

	var allAxis = (data[0].map(function(i, j){return i.axis})),	//Names of each axis
	//var allAxis = (data[1].map(function(i, j){return i.target_gene})),	//Names of each axis
		total = allAxis.length,					//The number of different axes
		radius = Math.min(cfg.w/2, cfg.h/2), 	//Radius of the outermost circle
		//Format = d3.format('%'),			 	//Percentage formatting
		Format = d3.format('.1f'),
		Format_over_90 = d3.format('.2f'),
		Format_value = d3.format('.3f'),
		angleSlice = Math.PI * 2 / total;		//The width in radians of each "slice"
	
	//Scale for the radius
	var rScale = d3.scaleLinear()
		.range([0, radius])
		.domain([0, maxValue]);
		
	/////////////////////////////////////////////////////////
	//////////// Create the container SVG and g /////////////
	/////////////////////////////////////////////////////////

	//Remove whatever chart with the same id/class was present before
	d3.select(id).select("svg").remove();
	
	//Initiate the radar chart SVG
	var svg = d3.select(id).append("svg")
			.attr("width",  cfg.w + cfg.margin.left + cfg.margin.right)
			.attr("height", cfg.h + cfg.margin.top + cfg.margin.bottom)
			.attr("class", "radar"+id);
			
	svg.append("text")
    		.attr("x", cfg.margin.left+100)             
    		.attr("y", cfg.margin.top/2)
    		.attr("text-anchor", "middle")
    		.style("font-size", "18px") 
    		.style("font-weight", "bold")
    		.style("fill", "#800000") 
    		//.style("font-family", "sans-serif")
    		.text(description1);
    		//.on("mouseover", function(d) {
    		//	d3.select(this).style("fill", "#800000");
    		//	d3.select(this).style("font-size", "17px");
    		//	//d3.select(this).style("cursor", "hand");
    		//})
    		//.on("mouseout", function(d) {
    		//	d3.select(this).style("fill", "black");
    		//	d3.select(this).style("font-size", "16px");
    		//});
    		//.on("click", function(){
    		//	if(rnaseq_gene.includes('Alias')){
    		//		window.open("https://www.ncbi.nlm.nih.gov/gene/?term=" + rnaseq_gene.split("Alias of ")[1].slice(0,-1), '_blank');
    		//		window.focus();
    		//	}
    		//	else {
    		//		window.open("https://www.ncbi.nlm.nih.gov/gene/?term=" + rnaseq_gene, '_blank');
    		//		window.focus();
    		//	}
    		//})
    		//.append('title')
    		//.text("Click to show gene information");
    		
    	svg.append("text")
    		.attr("x", cfg.margin.left+100)             
    		.attr("y", cfg.margin.top*9/10)
    		.attr("text-anchor", "middle")
    		.style("font-size", "14px")
    		//.style("font-family", "sans-serif")
    		.text(description2);
    		
	//Append a g element		
	var g = svg.append("g")
			.attr("transform", "translate(" + (cfg.w/2 + cfg.margin.left) + "," + (cfg.h/2 + cfg.margin.top) + ")");
	
	/////////////////////////////////////////////////////////
	////////// Glow filter for some extra pizzazz ///////////
	/////////////////////////////////////////////////////////
	
	//Filter for the outside glow
	var filter = g.append('defs').append('filter').attr('id','glow'),
		feGaussianBlur = filter.append('feGaussianBlur').attr('stdDeviation','2.5').attr('result','coloredBlur'),
		feMerge = filter.append('feMerge'),
		feMergeNode_1 = feMerge.append('feMergeNode').attr('in','coloredBlur'),
		feMergeNode_2 = feMerge.append('feMergeNode').attr('in','SourceGraphic');

	/////////////////////////////////////////////////////////
	/////////////// Draw the Circular grid //////////////////
	/////////////////////////////////////////////////////////
	
	//Wrapper for the grid & axes
	var axisGrid = g.append("g").attr("class", "axisWrapper");
	
	//Draw the background circles
	axisGrid.selectAll(".levels")
	   .data(d3.range(1,(cfg.levels+1)).reverse())
	   .enter()
		.append("circle")
		.attr("class", "gridCircle")
		.attr("r", function(d, i){return radius/cfg.levels*d;})
		.style("fill", "#9E9E9E")
		.style("stroke", "#CDCDCD")
		.style("fill-opacity", cfg.opacityCircles)
		.style("filter" , "url(#glow)");

	//Text indicating at what % each level is
	axisGrid.selectAll(".axisLabel")
	   .data(d3.range(1,(cfg.levels+1)).reverse())
	   .enter().append("text")
	   .attr("class", "axisLabel")
	   .attr("x", 4)
	   .attr("y", function(d){return -d*radius/cfg.levels;})
	   .attr("dy", "0.4em")
	   .style("font-size", "12px")
	   .style("font-weight", "bold")
	   //.attr("fill", "#737373")
	   .attr("fill", "#8B4513")
	   //.text(function(d,i) { return Format(1-maxValue * d/cfg.levels); });
	   .text(function(d,i) { if(cfg.zoom_cutoff >= 0.95) { return Format_value(1 - (maxValue * d/cfg.levels));} else if(cfg.zoom_cutoff >= 0.9) { return Format_over_90(1 - (maxValue * d/cfg.levels));} else { return Format(1 - (maxValue * d/cfg.levels)); } });

	//axisGrid.selectAll(".axisLabel")
	//   .data(d3.range(1,(cfg.levels+1)).reverse())
	//   .enter().append("text")
	//   .attr("class", "axisLabel")
	//   .attr("x", 4)
	//   .attr("y", function(d){return d*radius/cfg.levels;})
	//   .attr("dy", "0.4em")
	//   .style("font-size", "12px")
	//   //.attr("fill", "#737373")
	//   .attr("fill", "black")
	//   //.text(function(d,i) { return Format(1-maxValue * d/cfg.levels); });
	//   .text(function(d,i) { return Format(1 - (maxValue * d/cfg.levels)); });
	/////////////////////////////////////////////////////////
	//////////////////// Draw the axes //////////////////////
	/////////////////////////////////////////////////////////

	if(arrange_option == 'secondary_correlation'){
		//Create the straight lines radiating outward from the center
		var axis = axisGrid.selectAll(".axis")
			.data(allAxis)
			.enter()
			.append("g")
			.attr("class", "axis");
		//Append the lines
		axis.append("line")
			.attr("x1", 0)
			.attr("y1", 0)
			.attr("x2", function(d, i){ return rScale(maxValue*1.1) * Math.cos(angleSlice*i - Math.PI/2); })
			.attr("y2", function(d, i){ return rScale(maxValue*1.1) * Math.sin(angleSlice*i - Math.PI/2); })
			.attr("class", "line")
			.style("stroke", "white")
			.style("stroke-width", "2px");
	
		//Append the labels at each axis
		//axis.append("text")
		//	.attr("class", "legend")
		//	.style("font-size", "13px")
		//	.style("font-weight", "bold")
		//	.attr("text-anchor", "middle")
		//	.attr("dy", "0.35em")
		//	.attr("x", function(d, i){ return rScale(maxValue * cfg.labelFactor) * Math.cos(angleSlice*i - Math.PI/2); })
		//	.attr("y", function(d, i){ return rScale(maxValue * cfg.labelFactor) * Math.sin(angleSlice*i - Math.PI/2); })
		//	.text(function(d){ return d; })
		//	.on("mouseover", function(d,i){
		//      		d3.select(this).style("fill", "#800000");
		//      		d3.select(this).style("cursor", "hand");
		//      	})
		//	.on("mouseout", function(d,i) {
		//    		d3.select(this).style("fill", "#333333");
		//    	})
		//    	.on("click", function(d, i) {
		//		//window.open("http://rstats.immgen.org/GeneConstellation/index.html?genesymbol=" + d, "_self");
		//		document.getElementById('rnaseq_Gene').value=d;
		//		document.getElementById('rnaseq_submit').click();
		//	});
		//	//.call(wrap, cfg.wrapWidth);
	
		/////////////////////////////////////////////////////////
		///////////// Draw the radar chart blobs ////////////////
		/////////////////////////////////////////////////////////
		
		//The radial line function
		//var radarLine = d3.radialLine()
		//	.curve("linear-closed")
		//	.radius(function(d) { return rScale(d.value); })
		//	.angle(function(d,i) {	return i*angleSlice; });
		//	
		//if(cfg.roundStrokes) {
		//	radarLine.curve("cardinal-closed");
		//}
					
		//Create a wrapper for the blobs	
		var blobWrapper = g.selectAll(".radarWrapper")
			.data(data)
			.enter().append("g")
			.attr("class", "radarWrapper");
				
		//Append the backgrounds	
		//blobWrapper
		//	.append("path")
		//	.attr("class", "radarArea")
		//	.attr("d", function(d,i) { return radarLine(d); })
		//	.style("fill", function(d,i) { return cfg.color(i); })
		//	.style("fill-opacity", cfg.opacityArea)
		//	.on('mouseover', function (d,i){
		//		//Dim all blobs
		//		d3.selectAll(".radarArea")
		//			.transition().duration(200)
		//			.style("fill-opacity", 0.1); 
		//		//Bring back the hovered over blob
		//		d3.select(this)
		//			.transition().duration(200)
		//			.style("fill-opacity", 0.7);	
		//	})
		//	.on('mouseout', function(){
		//		//Bring back all blobs
		//		d3.selectAll(".radarArea")
		//			.transition().duration(200)
		//			.style("fill-opacity", cfg.opacityArea);
		//	});
			
		//Create the outlines	
		//blobWrapper.append("path")
		//	.attr("class", "radarStroke")
		//	.attr("d", function(d,i) { return radarLine(d); })
		//	.style("stroke-width", cfg.strokeWidth + "px")
		//	.style("stroke", function(d,i) { return cfg.color(i); })
		//	.style("fill", "none")
		//	.style("filter" , "url(#glow)");		
		
		//Append the circles
		//blobWrapper.selectAll(".radarCircle")
		blobWrapper.selectAll(".positve_gene .negative_gene")
			.data(function(d,i) { return d; })
			.enter().append("circle")
			//.attr("class", "radarCircle")
			.attr("class", function(d,i) { if(d.value > 0) { return "positve_gene" + i; } else { return "negative_gene" + i; } })
			.attr("r", cfg.dotRadius)
			.attr("cx", function(d,i){ return rScale(0) * Math.cos(angleSlice*i - Math.PI/2); })
			.attr("cy", function(d,i){ return rScale(0) * Math.sin(angleSlice*i - Math.PI/2); })
			.style("fill", function(d,i){ if(d.value > 0) { return cfg.color; } else { return cfg.color_negative; } })
			.style("stroke", cfg.strokeColor)
			.style("stroke-width", cfg.strokeWidth + "px")
			.on("mouseover", function(d,i){
		      		d3.select(this).style("fill", "#FFD700");
		      		d3.select(this).style("stroke", "#8B0000");
		      		d3.select(this).style("cursor", "hand");
		      		
		      		d3.selectAll("text.genename" + i)
		      			.style("fill", "#800000")
		      			.style("font-size", "14px");
          
		      		d3.selectAll("path.expr_line_all")
		      			.style("stroke", "#ddd")
		      			.style("stroke-width", 0.5);
		      			
		      		d3.selectAll("path.expr_line" + d.axis)
		      			.style("stroke", "steelblue")
		      			.style("stroke-width", 2);
		      		
		      		d3.selectAll("text.target_gene" + d.axis)
		      			.style("opacity", 1);
		      			
		      		var xPosition = d3.event.pageX+10;  
	    			var yPosition = d3.event.pageY+10;
	    			
	    			//if(filter_option == 'None'){
	    				d3.select("#tooltip")
	  	             		  .style("left", xPosition + "px")
	  	             		  .style("top", yPosition + "px")
	  	             		  .select("#tooltip_gene")
	  	             		  .text(d.axis);
	    				d3.select("#tooltip")
	  	             		  .style("left", xPosition + "px")
	  	             		  .style("top", yPosition + "px")
	  	             		  .select("#cor_value")
	  	             		  .text(Format_value(d.value));
		      			//Show the tooltip
	  	             	d3.select("#tooltip").classed("hidden", false);
	  	             //}
	  	             //else if(filter_option == 'GO'){
	  	             //	d3.select("#tooltip_GO")
	  	             //		  .style("left", xPosition + "px")
	  	             //		  .style("top", yPosition + "px")
	  	             //		  .select("#tooltip_gene_GO")
	  	             //		  .text(d.axis);
	    				//d3.select("#tooltip_GO")
	  	             //		  .style("left", xPosition + "px")
	  	             //		  .style("top", yPosition + "px")
	  	             //		  .select("#cor_value_GO")
	  	             //		  .text(Format_value(d.value));
	  	             //	d3.select("#tooltip_GO")
	  	             //		  .style("left", xPosition + "px")
	  	             //		  .style("top", yPosition + "px")
	  	             //		  .select("#go_similarity_value")
	  	             //		  .text(Format_value(d.go_similarity));
		      			////Show the tooltip
	  	             //	d3.select("#tooltip_GO").classed("hidden", false);
	  	             //}
		      	})
			.on("mouseout", function(d,i) {
		    		d3.select(this).style("fill", function(d,i){ if(d.value > 0) { return cfg.color; } else { return cfg.color_negative; } });
		    		
		    		d3.selectAll("text.genename" + i)
		      			.style("fill", "#333333")
		      			.style("font-size", "13px");
		      			
		      		d3.selectAll("path.expr_line_all")       
		      			.style("stroke", "steelblue")
		      			.style("stroke-width", 0.5);
		      		
		      		d3.selectAll("text.target_gene" + d.axis)
		      			.style("opacity", 0);
		      			
		    		d3.select(this).style("stroke", cfg.strokeColor);
		    		//if(filter_option == 'None'){
		    			d3.select("#tooltip").classed("hidden", true);
		    		//}
		    		//else if(filter_option == 'GO'){
		    		//	d3.select("#tooltip_GO").classed("hidden", true);
		    		//}
		    	})
		    	.on("click", function(d, i) {
		    		//if(filter_option == 'None'){
		    			d3.select("#tooltip").classed("hidden", true);
		    		//}
		    		//else if(filter_option == 'GO'){
		    		//	d3.select("#tooltip_GO").classed("hidden", true);
		    		//}
				document.getElementById('rnaseq_Gene').value=d.axis;
				//document.getElementById('rnaseq_submit').click();
				refresh_chart();
			})
			.transition()
			.duration(3500)
			.ease(d3.easeBounce)
			.attr("cx", function(d,i){ return rScale(1-Math.abs(d.value)) * Math.cos(angleSlice*i - Math.PI/2); })
			.attr("cy", function(d,i){ return rScale(1-Math.abs(d.value)) * Math.sin(angleSlice*i - Math.PI/2); });
		
		//Append the labels at each gene
		blobWrapper.selectAll(".genename")
			.data(function(d,i) { return d; })
			.enter().append("text")
			//.attr("class", "genename")
			.attr("class", function(d,i) { return "genename" + i; })
			.style("fill", "#333333")
			.style("font-size", "13px")
			.style("font-weight", "bold")
			.attr("text-anchor", "middle")
			.attr("dy", "0.35em")
			.attr("x", function(d, i){ return rScale(0) * Math.cos(angleSlice*i - Math.PI/2); })
			.attr("y", function(d, i){ return rScale(0) * Math.sin(angleSlice*i - Math.PI/2); })
			.on("mouseover", function(d,i){
		      		d3.select(this).style("fill", "#800000");
		      		//d3.select(this).style("font-weight", "bold");
		      		d3.select(this).style("font-size", "14px");
		      		d3.select(this).style("cursor", "hand");
		      		
		      		d3.selectAll("circle.positve_gene" + i)
		      			.style("fill", "#FFD700")
		      			.style("stroke", "#8B0000");
		      		
		      		d3.selectAll("circle.negative_gene" + i)
		      			.style("fill", "#FFD700")
		      			.style("stroke", "#8B0000");
		      		
		      		d3.selectAll("path.expr_line_all")
		      			.style("stroke", "#ddd")
		      			.style("stroke-width", 0.5);
		      			
		      		d3.selectAll("path.expr_line" + d.axis)
		      			.style("stroke", "steelblue")
		      			.style("stroke-width", 2);
		      		
		      		d3.selectAll("text.target_gene" + d.axis)
		      			.style("opacity", 1);
		      			
		      		var xPosition = d3.event.pageX+10;  
	    			var yPosition = d3.event.pageY+10;
	    			
		      		d3.select("#tooltip")
	  	             	  .style("left", xPosition + "px")
	  	             	  .style("top", yPosition + "px")
	  	             	  .select("#tooltip_gene")
	  	             	  .text(d.axis);
	    			d3.select("#tooltip")
	  	             	  .style("left", xPosition + "px")
	  	             	  .style("top", yPosition + "px")
	  	             	  .select("#cor_value")
	  	             	  .text(Format_value(d.value));
		      		//Show the tooltip
	  	            d3.select("#tooltip").classed("hidden", false);
		      			
		    })
			.on("mouseout", function(d,i) {
		    		d3.select(this).style("fill", "#333333");
		    		//d3.select(this).style("font-weight", "normal");
		    		d3.select(this).style("font-size", "13px");
		    		
		    		d3.selectAll("circle.positve_gene" + i)
		      			.style("fill", cfg.color)
		      			.style("stroke", cfg.strokeColor);
		      		
		      		d3.selectAll("circle.negative_gene" + i)
		      			.style("fill", cfg.color_negative)
		      			.style("stroke", cfg.strokeColor);
		      		
		      		d3.selectAll("path.expr_line_all")       
		      			.style("stroke", "steelblue")
		      			.style("stroke-width", 0.5);
		      		
		      		d3.selectAll("text.target_gene" + d.axis)
		      			.style("opacity", 0);
		      			
		      		d3.select("#tooltip").classed("hidden", true);
		    })
		    .on("click", function(d, i) {
		    	d3.select("#tooltip").classed("hidden", true);
				document.getElementById("rnaseq_Gene").value=d.axis;
				//document.getElementById("rnaseq_submit").click();
				refresh_chart();
			})
			.transition()
			.duration(3500)
			.ease(d3.easeBounce)
			.attr("x", function(d, i){ return rScale((1-Math.abs(d.value))) * Math.cos(angleSlice*i - Math.PI/2); })
			.attr("y", function(d, i){ return rScale((1-Math.abs(d.value))) * Math.sin(angleSlice*i - Math.PI/2) + 18; })
			.text(function(d){ return d.axis; });
			
	}
	else if(arrange_option == 'gene_location'){
		
		var chr_length = {"Chr1": 195471971,"Chr2": 182113224,"Chr3": 160039680,"Chr4": 156508116,"Chr5": 151834684,"Chr6": 149736546,"Chr7": 145441459,"Chr8": 129401213,"Chr9": 124595110,"Chr10": 130694993,"Chr11": 122082543,"Chr12": 120129022,"Chr13": 120421639,"Chr14": 124902244,"Chr15": 104043685,"Chr16": 98207768,"Chr17": 94987271,"Chr18": 90702639,"Chr19": 61431566,"ChrX": 171031299,"ChrY": 91744698, "ChrM": 16299};
		var chr_names = [];
		var angleSlice_chr = [];
		var angleSlice_chr_names = [];
		var total_length = 2725537669;
		var count = 0;
		var count_chr_names = 0;
		for(var key in chr_length){
			chr_names.push(key);
			angleSlice_chr.push(Math.PI * 2 * count / total_length);
			count_chr_names = count + chr_length[key]/2;
			angleSlice_chr_names.push(Math.PI * 2 * count_chr_names / total_length);		
			count = count + chr_length[key];
		}
		
		//var chr_cumulative_length = {"Chr1":0,"Chr2":195471971,"Chr3":377585195,"Chr4":537624875,"Chr5":694132991,"Chr6":845967675,"Chr7":995704221,"Chr8":1141145680,"Chr9":1270546893,"Chr10":1395142003,"Chr11":1525836996,"Chr12":1647919539,"Chr13":1768048561,"Chr14":1888470200,"Chr15":2013372444,"Chr16":2117416129,"Chr17":2215623897,"Chr18":2310611168,"Chr19":2401313807,"ChrX":2462745373,"ChrY":2633776672};
		var chr_cumulative_length = {"1":0,"2":195471971,"3":377585195,"4":537624875,"5":694132991,"6":845967675,"7":995704221,"8":1141145680,"9":1270546893,"10":1395142003,"11":1525836996,"12":1647919539,"13":1768048561,"14":1888470200,"15":2013372444,"16":2117416129,"17":2215623897,"18":2310611168,"19":2401313807,"X":2462745373,"Y":2633776672,"MT":2725521370};
	
		//Create the straight lines radiating outward from the center
		var axis = axisGrid.selectAll(".axis")
			.data(chr_names)
			.enter()
			.append("g")
			.attr("class", "axis");
		//Append the lines
		axis.append("line")
			.attr("x1", 0)
			.attr("y1", 0)
			.attr("x2", function(d, i){ return rScale(maxValue*1.1) * Math.cos(angleSlice_chr[i] - Math.PI/2); })
			.attr("y2", function(d, i){ return rScale(maxValue*1.1) * Math.sin(angleSlice_chr[i] - Math.PI/2); })
			.attr("class", "line")
			.style("stroke", "white")
			.style("stroke-width", "2px");
	
		//Append the labels at each axis
		axis.append("text")
			.attr("class", "legend")
			.attr("fill", "#263238")
			.style("font-size", "13px")
			.style("font-weight", "bold")
			.attr("text-anchor", "middle")
			.attr("dy", "0.35em")
			.attr("x", function(d, i){ return rScale(maxValue * cfg.labelFactor) * Math.cos(angleSlice_chr_names[i] - Math.PI/2); })
			.attr("y", function(d, i){ return rScale(maxValue * cfg.labelFactor) * Math.sin(angleSlice_chr_names[i] - Math.PI/2); })
			.text(function(d){ return d; })
			.on("mouseover", function(d,i){
		      		d3.select(this).style("fill", "red");
		      		//d3.select(this).style("cursor", "hand");
		    })
			.on("mouseout", function(d,i) {
		    		d3.select(this).style("fill", "#263238");
		    });
			
		//Create a wrapper for the blobs	
		var blobWrapper = g.selectAll(".radarWrapper")
			.data(data)
			.enter().append("g")
			.attr("class", "radarWrapper");
			
		//Append the circles
		//blobWrapper.selectAll(".radarCircle")
		blobWrapper.selectAll(".positve_gene_loc .negative_gene_loc")
			.data(function(d,i) { return d; })
			.enter().append("circle")
			//.attr("class", "radarCircle")
			.attr("class", function(d,i) { if(d.value > 0) { return "positve_gene_loc" + i; } else { return "negative_gene_loc" + i; } })
			.attr("r", cfg.dotRadius)
			.attr("cx", function(d,i){ return rScale(0) * Math.cos(Math.PI * 2 * (chr_cumulative_length[d.chr] + (d.start+d.end)/2) / total_length - Math.PI/2); })
			.attr("cy", function(d,i){ return rScale(0) * Math.sin(Math.PI * 2 * (chr_cumulative_length[d.chr] + (d.start+d.end)/2) / total_length - Math.PI/2); })
			.style("fill", function(d,i){ if(d.value > 0) { return cfg.color; } else { return cfg.color_negative; } })
			.style("stroke", cfg.strokeColor)
			.style("stroke-width", cfg.strokeWidth + "px")
			.on("mouseover", function(d,i){
		      		d3.select(this).style("fill", "#FFD700");
		      		d3.select(this).style("stroke", "#8B0000");
		      		d3.select(this).style("cursor", "hand");
		      		
		      		d3.selectAll("text.genename_loc" + i)
		      			.style("fill", "#800000")
		      			.style("font-size", "14px");
		      		
		      		d3.selectAll("path.expr_line_all")
		      			.style("stroke", "#ddd")
		      			.style("stroke-width", 0.5);
		      			
		      		d3.selectAll("path.expr_line" + d.axis)
		      			.style("stroke", "steelblue")
		      			.style("stroke-width", 2);
		      		
		      		d3.selectAll("text.target_gene" + d.axis)
		      			.style("opacity", 1);
		      			
		      		var xPosition = d3.event.pageX+10;  
	    			var yPosition = d3.event.pageY+10;
	    			
	    			//if(filter_option == 'None'){
	    				d3.select("#tooltip_location")
	  	             		  .style("left", xPosition + "px")
	  	             		  .style("top", yPosition + "px")
	  	             		  .select("#tooltip_location_gene")
	  	             		  .text(d.axis);
	  	             		d3.select("#tooltip_location")
	  	             		  .style("left", xPosition + "px")
	  	             		  .style("top", yPosition + "px")
	  	             		  .select("#tooltip_location_loc")
	  	             		  .text('Chr'+d.chr+': '+d.start.toLocaleString()+' - '+d.end.toLocaleString());
	    				d3.select("#tooltip_location")
	  	             		  .style("left", xPosition + "px")
	  	             		  .style("top", yPosition + "px")
	  	             		  .select("#tooltip_location_cor_value")
	  	             		  .text(Format_value(d.value));
		      			//Show the tooltip
	  	             		d3.select("#tooltip_location").classed("hidden", false);
	  	             	//}
	  	             	//else if(filter_option == 'GO'){
	  	             	//	d3.select("#tooltip_location_GO")
	  	             	//	  .style("left", xPosition + "px")
	  	             	//	  .style("top", yPosition + "px")
	  	             	//	  .select("#tooltip_location_gene_GO")
	  	             	//	  .text(d.axis);
	  	             	//	d3.select("#tooltip_location_GO")
	  	             	//	  .style("left", xPosition + "px")
	  	             	//	  .style("top", yPosition + "px")
	  	             	//	  .select("#tooltip_location_loc_GO")
	  	             	//	  .text('Chr'+d.chr+': '+d.start.toLocaleString()+' - '+d.end.toLocaleString());
	    				//d3.select("#tooltip_location_GO")
	  	             	//	  .style("left", xPosition + "px")
	  	             	//	  .style("top", yPosition + "px")
	  	             	//	  .select("#tooltip_location_cor_value_GO")
	  	             	//	  .text(Format_value(d.value));
	  	             	//	d3.select("#tooltip_location_GO")
	  	             	//	  .style("left", xPosition + "px")
	  	             	//	  .style("top", yPosition + "px")
	  	             	//	  .select("#tooltip_location_go_similarity_value")
	  	             	//	  .text(Format_value(d.go_similarity));
		      			////Show the tooltip
	  	             	//	d3.select("#tooltip_location_GO").classed("hidden", false);
	  	             	//}
		      	})
			.on("mouseout", function(d,i) {
		    		d3.select(this).style("fill", function(d,i){ if(d.value > 0) { return cfg.color; } else { return cfg.color_negative; } });
		    		
		    		d3.selectAll("text.genename_loc" + i)
		      			.style("fill", "#333333")
		      			.style("font-size", "13px");
		      			
		    		d3.selectAll("path.expr_line_all")       
		      			.style("stroke", "steelblue")
		      			.style("stroke-width", 0.5);
		      		
		      		d3.selectAll("text.target_gene" + d.axis)
		      			.style("opacity", 0);
		      			
		    		d3.select(this).style("stroke", cfg.strokeColor);
		    		//if(filter_option == 'None'){
		    			d3.select("#tooltip_location").classed("hidden", true);
		    		//}
		    		//else if(filter_option == 'GO'){
		    		//	d3.select("#tooltip_location_GO").classed("hidden", true);
		    		//}
		    	})
		    	.on("click", function(d, i) {
				//if(filter_option == 'None'){
		    			d3.select("#tooltip_location").classed("hidden", true);
		    		//}
		    		//else if(filter_option == 'GO'){
		    		//	d3.select("#tooltip_location_GO").classed("hidden", true);
		    		//}
				document.getElementById('rnaseq_Gene').value=d.axis;
				//document.getElementById('rnaseq_submit').click();
				refresh_chart();
			})
			.transition()
			.duration(3500)
			.ease(d3.easeBounce)
			.attr("cx", function(d,i){ return rScale(1-Math.abs(d.value)) * Math.cos(Math.PI * 2 * (chr_cumulative_length[d.chr] + (d.start+d.end)/2) / total_length - Math.PI/2); })
			.attr("cy", function(d,i){ return rScale(1-Math.abs(d.value)) * Math.sin(Math.PI * 2 * (chr_cumulative_length[d.chr] + (d.start+d.end)/2) / total_length - Math.PI/2); });
			
		//Append the labels at each gene
		blobWrapper.selectAll(".genename_loc")
			.data(function(d,i) { return d; })
			.enter().append("text")
			//.attr("class", "genename")
			.attr("class", function(d,i) { return "genename_loc" + i; })
			.style("fill", "#333333")
			.style("font-size", "13px")
			.style("font-weight", "bold")
			.attr("text-anchor", "right")
			.attr("dy", "0.35em")
			.attr("x", function(d,i){ return rScale(0) * Math.cos(Math.PI * 2 * (chr_cumulative_length[d.chr] + (d.start+d.end)/2) / total_length - Math.PI/2) + 12; })
			.attr("y", function(d,i){ return rScale(0) * Math.sin(Math.PI * 2 * (chr_cumulative_length[d.chr] + (d.start+d.end)/2) / total_length - Math.PI/2); })
			.on("mouseover", function(d,i){
		      		d3.select(this).style("fill", "#800000");
		      		//d3.select(this).style("font-weight", "bold");
		      		d3.select(this).style("font-size", "14px");
		      		d3.select(this).style("cursor", "hand");
		      		
		      		d3.selectAll("circle.positve_gene_loc" + i)
		      			.style("fill", "#FFD700")
		      			.style("stroke", "#8B0000");
		      		
		      		d3.selectAll("circle.negative_gene_loc" + i)
		      			.style("fill", "#FFD700")
		      			.style("stroke", "#8B0000");
		      		
		      		d3.selectAll("path.expr_line_all")
		      			.style("stroke", "#ddd")
		      			.style("stroke-width", 0.5);
		      			
		      		d3.selectAll("path.expr_line" + d.axis)
		      			.style("stroke", "steelblue")
		      			.style("stroke-width", 2);
		      		
		      		d3.selectAll("text.target_gene" + d.axis)
		      			.style("opacity", 1);
		      			
		      		var xPosition = d3.event.pageX+10;  
	    			var yPosition = d3.event.pageY+10;
	    			
	    			d3.select("#tooltip_location")
	  	             	  .style("left", xPosition + "px")
	  	             	  .style("top", yPosition + "px")
	  	             	  .select("#tooltip_location_gene")
	  	             	  .text(d.axis);
	  	            d3.select("#tooltip_location")
	  	             	  .style("left", xPosition + "px")
	  	             	  .style("top", yPosition + "px")
	  	             	  .select("#tooltip_location_loc")
	  	             	  .text('Chr'+d.chr+': '+d.start.toLocaleString()+' - '+d.end.toLocaleString());
	    			d3.select("#tooltip_location")
	  	             	  .style("left", xPosition + "px")
	  	             	  .style("top", yPosition + "px")
	  	             	  .select("#tooltip_location_cor_value")
	  	             	  .text(Format_value(d.value));
		      		//Show the tooltip
	  	            d3.select("#tooltip_location").classed("hidden", false);
		    })
			.on("mouseout", function(d,i) {
		    		d3.select(this).style("fill", "#333333");
		    		//d3.select(this).style("font-weight", "normal");
		    		d3.select(this).style("font-size", "13px");
		    		
		    		d3.selectAll("circle.positve_gene_loc" + i)
		      			.style("fill", cfg.color)
		      			.style("stroke", cfg.strokeColor);
		      		
		      		d3.selectAll("circle.negative_gene_loc" + i)
		      			.style("fill", cfg.color_negative)
		      			.style("stroke", cfg.strokeColor);
		      			
		      		d3.selectAll("path.expr_line_all")       
		      			.style("stroke", "steelblue")
		      			.style("stroke-width", 0.5);
		      		
		      		d3.selectAll("text.target_gene" + d.axis)
		      			.style("opacity", 0);
		      			
		      		d3.select("#tooltip_location").classed("hidden", true);
		    })
		    .on("click", function(d, i) {
		    	d3.select("#tooltip_location").classed("hidden", true);
				document.getElementById('rnaseq_Gene').value=d.axis;
				//document.getElementById('rnaseq_submit').click();
				refresh_chart();
			})
			.transition()
			.duration(3500)
			.ease(d3.easeBounce)
			.attr("x", function(d,i){ return rScale(1-Math.abs(d.value)) * Math.cos(Math.PI * 2 * (chr_cumulative_length[d.chr] + (d.start+d.end)/2) / total_length - Math.PI/2) + 12; })
			.attr("y", function(d,i){ return rScale(1-Math.abs(d.value)) * Math.sin(Math.PI * 2 * (chr_cumulative_length[d.chr] + (d.start+d.end)/2) / total_length - Math.PI/2); })
			.text(function(d){ return d.axis; });
	}



	//d3.selectAll(".radarCircle")
	//	.transition()
	//	//.delay(50)
	//	.duration(3500)
	//	.ease(d3.easeBounce)
	//	.attr("cx", function(d,i){ return rScale(d.value) * Math.cos(angleSlice*i - Math.PI/2); })
	//	.attr("cy", function(d,i){ return rScale(d.value) * Math.sin(angleSlice*i - Math.PI/2); })
	//	.on('click', function(d, i) {
	//		alert("click " + d.axis);
	//	})
	//	.on("mouseover", function(d){
	//      		//d3.select(this).attr("fill", "red");
	//      		this.setState({ fillColour: 'red' });
	//      		console.log('over');
	//      	})
	//	.on("mouseout", function(d) {
	//    		//d3.select(this).attr("fill", "#4169E1");  
	//    		this.setState({ fillColour: '#4169E1' });
	//    		console.log('out');
	//    	});
		//.attr("transform", function(d) { return 'translate(' + [0, 0] + ')'; });

	/////////////////////////////////////////////////////////
	//////// Append invisible circles for tooltip ///////////
	/////////////////////////////////////////////////////////
	
	//Wrapper for the invisible circles on top
	//var blobCircleWrapper = g.selectAll(".radarCircleWrapper")
	//	.data(data)
	//	.enter().append("g")
	//	.attr("class", "radarCircleWrapper");
	//	
	////Append a set of invisible circles on top for the mouseover pop-up
	//blobCircleWrapper.selectAll(".radarInvisibleCircle")
	//	.data(function(d,i) { return d; })
	//	.enter().append("circle")
	//	.attr("class", "radarInvisibleCircle")
	//	.attr("r", cfg.dotRadius*1.5)
	//	.attr("cx", function(d,i){ return rScale(d.value) * Math.cos(angleSlice*i - Math.PI/2); })
	//	.attr("cy", function(d,i){ return rScale(d.value) * Math.sin(angleSlice*i - Math.PI/2); })
	//	.style("fill", "none")
	//	.style("pointer-events", "all")
	//	.on("mouseover", function(d,i) {
	//		newX =  parseFloat(d3.select(this).attr('cx')) - 10;
	//		newY =  parseFloat(d3.select(this).attr('cy')) - 10;
	//				
	//		tooltip
	//			.attr('x', newX)
	//			.attr('y', newY)
	//			//.text(Format(d.value))
	//			.text(1-d.value)
	//			.transition().duration(200)
	//			.style('opacity', 1);
	//	})
	//	.on("mouseout", function(){
	//		tooltip.transition().duration(200)
	//			.style("opacity", 0);
	//	});
	//	
	////Set up the small tooltip for when you hover over a circle
	//var tooltip = g.append("text")
	//	.attr("class", "tooltip")
	//	.style("opacity", 0);
	
	/////////////////////////////////////////////////////////
	/////////////////// Helper Function /////////////////////
	/////////////////////////////////////////////////////////

	//Taken from http://bl.ocks.org/mbostock/7555321
	//Wraps SVG text	
	//function wrap(text, width) {
	//  text.each(function() {
	//	var text = d3.select(this),
	//		words = text.text().split(/\s+/).reverse(),
	//		word,
	//		line = [],
	//		lineNumber = 0,
	//		lineHeight = 1.4, // ems
	//		y = text.attr("y"),
	//		x = text.attr("x"),
	//		dy = parseFloat(text.attr("dy")),
	//		tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
	//		
	//	while (word = words.pop()) {
	//	  line.push(word);
	//	  tspan.text(line.join(" "));
	//	  if (tspan.node().getComputedTextLength() > width) {
	//		line.pop();
	//		tspan.text(line.join(" "));
	//		line = [word];
	//		tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
	//	  }
	//	}
	//  });
	//}//wrap	
	
}//RadarChart
