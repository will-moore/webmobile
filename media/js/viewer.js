$(document).ready(function() {
    
    $(".controls").hide();
    
    var z = 0;
    var t = 0;
    var sizeZ = 1;
    var sizeT = 1;
    var pixelSize = 0;
    var json;
    var activeCs = [];
    var currentChannel = -1;
    var projectionOn = false;
    var rWindows = {};  // keep track of rendering settings - populate from json
    
    // elements we need repeatedly
    var imageId = $("#imageId").text();
    var $imagePlane = $("#imagePlane");
    var $imageContainer = $("#imageContainer");
    var $zControls = $("#zControls");
    var $tControls = $("#tControls");
    var $zSlider = $("#zSlider");
    var $tSlider = $("#tSlider");
    var $infoIcon = $("#infoIcon");
    $infoIcon.hide();
    var $infoPanel = $("#infoPanel");
    var $rendIcon = $("#rendIcon");
    $rendIcon.hide();
    var $renderingPanel = $("#renderingPanel");
    $renderingPanel.hide();
    var $renderingText = $("#renderingText");
    var $renderingOverlay = $("#renderingOverlay");
    var $gradient = $("#gradient");
    var $winStartPointer = $("#winStartPointer");
    var $winEndPointer = $("#winEndPointer");
    var $channelButtons = $("#channelButtons");
    var $projButton = $("#projectionButton");
    
    var buttUpSrc = $("#button-up").attr('src');
    var buttDownSrc = $("#button-down").attr('src');
    var buttDownSelectSrc = $("#button-down-select").attr('src');
    var projOnSrc = $("#proj-on").attr('src');
    var projOffSrc = $("#proj-off").attr('src');
    
    // --- functions ---
    
    var handleRenderSliderClick = function(event) {
        
        // need to work out where the point is wrt width of slider 
        var x = event.pageX - this.offsetLeft;
        var w = $renderingPanel.css('width');
        
        var selectedChannel = json["channels"][currentChannel];
        var color = "#" + selectedChannel["color"];
        var label = selectedChannel["label"];
        var win = selectedChannel["window"];
        var min = win["min"];
        var max = win["max"];
        var start = rWindows[currentChannel][0];
        var end = rWindows[currentChannel][1];
        var range = max-min;
        
        // need to know which slider knob to move
        var newVal = min + ( (parseFloat(x)/parseInt(w)) * range );
        var midway = start + ( (end-start)/2 )
        
        if (newVal < midway) {
            rWindows[currentChannel][0] = newVal;
        } else {
            rWindows[currentChannel][1] = newVal;
        }
        showRenderingControls();
        refreshImage();
    }
    
    var toggleProjection = function() {
        projectionOn = (!projectionOn);
        var buttonSrc = projOffSrc;
        if (projectionOn) {
            buttonSrc = projOnSrc;
        }
        $(this).attr('src', buttonSrc);
        
        refreshImage();
    }
    
    var handleChannelButton = function() {
        var buttonImg = $(this);
        var c = buttonImg.attr('id').replace('cb', '');     // E.g. id = 'cb1'
        var cIndex = parseInt(c);
        
        // if we clicked a button that is not current channel...
        if (cIndex != currentChannel) {
            // ... if it's not selected, turn channel on.
            if (!activeCs[cIndex]) {
                activeCs[cIndex] = true;
                buttonImg.attr('src', buttDownSrc);
            }
            currentChannel = cIndex;    // change current channel
        }
        else {
            // clicked the current channel - toggle on/off
            var newActive = buttonImg.attr('src') == buttUpSrc;
            activeCs[cIndex] = newActive;
            var newSrc = buttDownSrc;
            if (!newActive) {
                newSrc = buttUpSrc;
                for (var i=0; i<activeCs.length; i++) {
                    if (activeCs[i]) {
                        currentChannel = i;
                        break;
                    }
                }
            }
            buttonImg.attr('src', newSrc);
        }
        
        $zControls.hide();
        $tControls.hide();
        showRenderingControls();
        refreshChannelButtons();
        refreshImage();
    }
    
    var refreshChannelButtons = function() {
        
        // now update src of each button
        var newSrc = "";
        for (var i=0; i<activeCs.length; i++) {
            newSrc = buttUpSrc;
            if (activeCs[i]) {
                newSrc = buttDownSrc;
                if (currentChannel == i) {
                    newSrc = buttDownSelectSrc;
                }
            }
            $("#cb"+i).attr('src', newSrc);
        }
    }
    
    var buildChannelButtons = function() {
        
        // this is called every time that controls are shown, but the buttons are only 
        // built the first time. Use json data...
        var clist = json["channels"];
        if (activeCs.length == 0) {
            // build a column of buttons
            var rHtml = "<table border='0' cellpadding='0' cellspacing='0' >";
            for (var c=0; c<clist.length; c++) {
                var cdata = clist[c];
                activeCs.push(cdata["active"]);
                var colour = cdata["color"];
                var src = buttUpSrc;
                if (activeCs[c]) {
                    src = buttDownSrc;
                }

                rHtml += "<tr><td bgcolor='#" + colour + "'><img id='cb"+ c +"' class='channelButton' src='"+ src +"' /></td></tr>";
            }
            rHtml += "</table>";
            $channelButtons.append($(rHtml));
            $(".channelButton").click(handleChannelButton);
        }
    }
    
    var showRenderingControls = function() {
        
        var scrollX = window.pageXOffset; 
        var scrollY = window.pageYOffset; 
        var scrollW = window.innerWidth;
        var scrollH = window.innerHeight;
        var h = scrollW / 8;
        var thickness = h * 0.75;
        
        var selectedChannel = json["channels"][currentChannel];
        var color = "#" + selectedChannel["color"];
        var label = selectedChannel["label"];
        var rHtml = "<span>" + label + "</span>";
        var font = 200 * scrollW/480 + "%";
        var win = selectedChannel["window"];
        var min = win["min"];
        var max = win["max"];
        var start = rWindows[currentChannel][0];
        var end = rWindows[currentChannel][1];
        var range = max-min;
        
        var pointerH = h * 0.75;
        var halfW = (pointerH * 50)/128;
        var startx = scrollW * (start-min)/range;
        var endx = scrollW * (end-min)/range;
        
        $renderingPanel.css('top', scrollY+scrollH-h).css('left', scrollX).css('height',thickness).css('width',scrollW)
            .css('background', color);
        $gradient.css('top', scrollY+scrollH-h).css('left', scrollX).css('height',thickness).css('width',scrollW).show();
        $renderingText.css('top', scrollY+scrollH-h).css('left', scrollX).css('height',thickness).css('width',scrollW).css('font-size', font);
        $renderingText.empty().append($(rHtml)).show();
        $renderingOverlay.css('top', scrollY+scrollH-h).css('left', scrollX).css('height',h).css('width',scrollW).show();
        
        $winStartPointer.css('top',scrollY+scrollH-pointerH).css('left', scrollX+startx-halfW).css('height', pointerH).show();
        $winEndPointer.css('top',scrollY+scrollH-pointerH).css('left', scrollX+endx-halfW).css('height', pointerH).show();
        
        $renderingPanel.show();
    }
    
    var showInfoPanel = function() {
        
        var iHtml = buildImageInfo(json);
        $infoPanel.empty();
        $infoPanel.append($(iHtml));
        
        var scrollX = window.pageXOffset; 
        var scrollY = window.pageYOffset; 
        var scrollW = window.innerWidth;
        var scrollH = window.innerHeight;
        
        var font = 150 * scrollW/480 + "%";
        var w = scrollW / 8;
        
        $infoPanel.css('top', scrollY).css('left', scrollX).css('font-size', font)
            .css('padding', scrollW/50);
            
        $infoPanel.show();
        hideControls();
    }
    
    var buildImageInfo = function(jsonData) {
        // html of image metadata. Start with name...
        var infoHtml = "<h2>"+ jsonData["meta"]["imageName"] + "</h2>";
        
        // table of metadata...
        infoHtml += "<table>";
        var labels = ["ID", "Owner", "Description", "Project", "Dataset"];
        var metaKeys = ["imageId", "imageAuthor", "imageDescription", "projectName", "datasetName"];
        for (var i=0; i<labels.length; i++) {
            infoHtml += "<tr><td>" + labels[i] + "</td><td>" + jsonData["meta"][metaKeys[i]] + "</td></tr>";
        }
        // ..pixel sizes...
        try {
            var x = parseFloat(jsonData["pixel_size"]["x"]).toFixed(2)
            var y = parseFloat(jsonData["pixel_size"]["y"]).toFixed(2)
            var z = parseFloat(jsonData["pixel_size"]["z"]).toFixed(2)
            infoHtml += "<tr><td>Pixel Sizes (x,y,z)</td><td>" + x + ", " + y + ", " + z + " &micro;m</td></tr>";
        }
        catch(err) {}
        
        // ..image dimensions...
        var width = jsonData["size"]["width"];
        var height = jsonData["size"]["height"];
        infoHtml += "<tr><td>Image size (x,y)</td><td>" + width + ", " + height + "</td></tr>";
        var z = jsonData["size"]["z"];
        var t = jsonData["size"]["t"];
        infoHtml += "<tr><td>Image size (z,time)</td><td>" + z + ", " + t + "</td></tr>";
        infoHtml += "<table>";
        
        // Channels table...
        infoHtml += "<table>";
        var clist = jsonData["channels"];
        for (var c=0; c<clist.length; c++) {
            var cdata = clist[c];
            var colour = cdata["color"];
            infoHtml += "<tr><td bgcolor='#" + colour + "'>&nbsp &nbsp&nbsp</td><td>" + cdata["label"] + "</td></tr>";
        }
        
        return infoHtml;
    };
    
    // update the image with the current z and t indexes
    var refreshImage = function() {
        var imgSrc = "/webgateway/render_image/"+ imageId + "/" + z + "/" + t + "/";
        var renderQuery = ""
        if (activeCs.length > 0) {
            renderQuery += "c=";
        
            for (var c=1; c<=activeCs.length; c++) {
                if (c > 1) renderQuery += ",";
                if (!(activeCs[c-1])) renderQuery += "-";
                renderQuery += (c + "|"+ rWindows[c-1][0] + ":" + rWindows[c-1][1]);
            }
        }
        if (projectionOn) {
            if (renderQuery.length > 0) {
                renderQuery += "&";
            }
            renderQuery += "p=intmax";
        }
        if (renderQuery.length > 1) {
            imgSrc = imgSrc + "?" + renderQuery
        }
        $("#imagePlane").attr('src', imgSrc);
        
        // find the slider positions
        if (sizeZ > 1) {
            $(".zPoint").css('background', 'none');
            if (!projectionOn) {
               $("#z"+z).css('background', 'red');
            }
        }
        if (sizeT > 1) {
            $(".tPoint").css('background', 'none');
            $("#t"+t).css('background', 'red');
        }
    };
    
    // call this periodiclly to check whether the viewport has moved. If so, hide 
    var checkHideControls = function() {
        var scrollX = window.pageXOffset; 
        var scrollY = window.pageYOffset;
        var x = parseFloat( $("#zControls").css('left'), 10 );
        var y = parseFloat( $("#zControls").css('top'), 10 );
        if ((x != scrollX) || (y != scrollY)){
            hideControls();
        }
    };
    
    // this positions the controls within the current viewport and shows them 
    var showControls = function() {
        
        // otherwise, show scroll bars
        var scrollX = window.pageXOffset; 
        var scrollY = window.pageYOffset; 
        var scrollW = window.innerWidth;
        var scrollH = window.innerHeight;
        
        var w = Math.min(scrollW,scrollH) / 8;    // w is the size of buttons, menus etc. 
        var zHeight = scrollH - w
        var tWidth = scrollW - w
        
        // sliders
        $("#zControls").css('top', scrollY).css('left', scrollX).css('width', w).css('height', zHeight);
        $("#zBg").css('width', w).css('height', zHeight);
        $("#tControls").css('top', scrollY+zHeight).css('left', scrollX+w).css('height', w).css('width', tWidth);
        $("#tBg").css('height', w).css('width', tWidth);
        $(".arrow").css('width', w).css('height', w);
        $zSlider.css('top', w).css('height',zHeight-w-w-2);
        $zSlider.css('width',w-2);
        $tSlider.css('height', w-2 ).css('width',tWidth-w-w-2).css('left',w).css('top',1);
        
        // info icon - top right corner
        var iconW = Math.min(scrollW,scrollH) / 8;
        var margin = scrollW/70;
        $infoIcon.css('top', scrollY+margin).css('left', scrollX+scrollW-iconW-margin).css('width', iconW).css('height', iconW);
        
        // channel-buttons - top right corner
        buildChannelButtons();  // only used first time
        $channelButtons.css('top', scrollY+margin+iconW).css('left', scrollX+scrollW-iconW-margin).css('width', iconW);
        $(".channelButton").css('width', iconW).css('height', iconW);
        
        // projection button
        $projButton.css('top', scrollY+margin).css('left', scrollX+scrollW-iconW-iconW-margin)
            .css('width', iconW).css('height', iconW).css('opacity', 0.7);
        
        // scalebar 
        if (pixelSize == 0) {
            $("#scalebar").css('opacity', 0.0); // hide so it won't be shown
        } else {
            var scaleW = scrollW / 3;
            var scaleMicrons = (scaleW * pixelSize);
            var barMicrons = parseInt(scaleMicrons / 5) * 5;
            if (barMicrons == 0) barMicrons = parseInt(scaleMicrons);
            scaleW = barMicrons /pixelSize;
            var scaleH = scrollH / 100;
            var indent = w/3;
            $("#scalebar").css('height', scaleH).css('width', scaleW)
            .css('top', scrollY+scrollH-w-scaleH-indent).css('left',scrollX+scrollW-scaleW-indent);
            
            var $scaleNumber = $("#scaleNumber");
            var numW = scaleW/4;
            var numH = scrollW/480 * 40;
            var font = 200 * scrollW/480 + "%";
            var top = scrollY+scrollH-w-scaleH-indent-numH;
            $("#scaleNumber").text(barMicrons)
                .css('width', numW).css('height', numH).css('font-size', font)
                .css('top', top).css('left', scrollX+scrollW-indent-numW);
        }
        $(".controls").show();
        $imagePlane.one('click', hideControls);
    };
    
    // hides the controls
    var hideControls = function() {
        $renderingPanel.hide();
        $(".pointer").hide();
        $gradient.hide();
        $renderingText.hide();
        $renderingOverlay.hide();
        
        $imagePlane.unbind('click', hideControls);  // in case hideControls wasn't called from imagePlane
        
        // reset active channel to -1 (no channels active)
        currentChannel = -1;
        refreshChannelButtons();
        
        $(".controls").fadeOut();
        $imagePlane.one('click', showControls);
    };
    
    
    // -- bind various functions to controls --
    
    // Show info
    $infoIcon.click(showInfoPanel);
    // toggle projection
    $projButton.click(toggleProjection);
    // click on the rendering slider - renderingText is the top layer
    $renderingOverlay.click(handleRenderSliderClick);
    
    // When a slider is clicked, try to identify the actual increment that was clicked, set z or t and refresh
    $zSlider.click(function(event) {
        var zId = event.target.id;      // E.g. 'z10'
        var zIndex = parseFloat(zId.replace("z",""), 10 );
        if (!isNaN(zIndex)) {
            z = zIndex;
            refreshImage();
        }
    });
    $tSlider.click(function(event) {
        var tId = event.target.id;      // E.g. 't10'
        var tIndex = parseFloat(tId.replace("t",""), 10 );
        if (!isNaN(tIndex)) {
            t = tIndex;
            refreshImage();
        }
    });
    
    // The Z arrows and T arrows increment Z or T and refresh the image
    $(".arrow").click(function(event) {
        if ((this.id == 'zUp') && (z < sizeZ-1)) z += 1;
        if ((this.id == 'zDown') && (z>0)) z -= 1;
        if ((this.id == 'tRight') && (t < sizeT-1)) t += 1;
        if ((this.id == 'tLeft') && (t>0)) t -= 1;
        refreshImage();
    });
    
    // Show controls when the iamge is clicked - next click will hide controls - etc 
    $imagePlane.one('click', showControls);
    
    // Hide info panel when it's clicked
    $infoPanel.click(function() {
        $infoPanel.hide();
        return false;
    });
    
    
    // -- stuff that happens when the page loads --
    
    // make the 'image container' bigger that the image according to viewport so that all image is within
    var scrollW = window.innerWidth;
    var scrollH = window.innerHeight;
    var portWH = scrollW / scrollH;
    var imgW = parseFloat( $imagePlane.css('width'), 10 );
    var imgH = parseFloat( $imagePlane.css('height'), 10 );
    var imageWH = imgW/imgH;
    
    // when the page loads, first need to get the default Z and T from imgData JSON, then load image
    $.getJSON("/webgateway/imgData/" + imageId + "/", function(data) {
        json = data;
        z = json['rdefs']['defaultZ'];
        t = json['rdefs']['defaultT'];
        pixelSize = json['pixel_size']['x'];

        // build z and t sliders
        sizeZ = json['size']['z'];
        sizeT = json['size']['t'];
        var html = "<table height='100%' width='100%' cellspacing='0' border='0'>";
        for (var zz=sizeZ-1; zz>=0; zz--) {
            html += "<tr><td id='z" + zz +"' class='zPoint'></td></tr>";    // each table row is a z-increment
        }
        html += "</table>";
        $zSlider.append($(html));
        
        html = "<table height='100%' width='100%' cellspacing='0' border='0'><tr>";
        for (var tt=0; tt<sizeT; tt++) {
            html += "<td id='t" + tt +"' class='tPoint'></td>";    // each table col is a t-increment
        }
        html += "</tr></table>";
        $tSlider.append($(html));
        
        cList = json["channels"];
        for (var c=0; c<cList.length; c++) {
            var s = cList[c]["window"]["start"];
            var e = cList[c]["window"]["end"];
            rWindows[c] = [s, e];
        }
        
        // update sliders and image plane
        refreshImage();
    });
    
    // set opacity via jquery (browser consistency)
    $(".controlBg").css('opacity', 0.5);
    $(".controls").hide();
    
    // start a timer to check for viewport movement every half sec 
    setInterval(checkHideControls, 500);
    
    // if imageWH > portWH, image container is same width as image, height is bigger
    if (imageWH > portWH) {
        var containerW = imgW;
        var containerH = containerW / portWH;
        
        var topSpacer = (containerH - imgH) / 2;
        $imagePlane.css('top', topSpacer + "px");
    }
});