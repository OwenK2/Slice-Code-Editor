function setTheme(theme,update) {
	theme = theme.replace('ace/theme/', '');
	if(update && user.prefrences.theme === 'ace/theme/' + theme) {return;}
	user.prefrences.theme = 'ace/theme/' + theme;
	user.panels.forEach(function(panel) {
		panel.editors.forEach(function(editor) {
			if(editor.setOption){editor.setOption('theme', user.prefrences.theme);}
		});
	});
	user.panels[0].editor.renderer.on('themeLoaded', function() {
		var dark = user.panel.editor.renderer.theme.isDark;
		document.documentElement.style.setProperty('--show', dark ? '#fff' : '#000');
		document.documentElement.style.setProperty('--blend', dark ? '#000' : '#fff');
		document.documentElement.style.setProperty('--transparent', dark ? 'url(lib/darktransparent.jpeg)' : 'url(lib/lighttransparent.jpeg)');
		document.documentElement.style.setProperty('--highlight', dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)');
		var reg = new RegExp(user.panel.editor.renderer.theme.cssClass+'[\\s]*{([^}]+)}', 'gi');
		var css = user.panel.editor.renderer.theme.cssText;
		var main = reg.exec(css)[1];
		var bg = /background-color:([^;]+);/g.exec(main) || /background:([^;]+);/g.exec(main);
		document.documentElement.style.setProperty('--background', bg[1]);
		document.documentElement.style.setProperty('--activetext', /(?:^|[^-])color:([^;}]+)/g.exec(main)[1]);
		var findAccent = /.ace_identifier[\s]+{([^}]+)}/gi.exec(css) || /.ace_keyword[^{]+{([^}]+)}/gi.exec(css) || /.ace_string[^{]+{([^}]+)}/gi.exec(css);
		if(/(?:^|[^-])color:([^;}]+)/g.exec(findAccent[1]) === null) {findAccent = /.ace_string[^{]+{([^}]+)}/gi.exec(css);}
		document.documentElement.style.setProperty('--accent', /(?:^|[^-])color:([^;}]+)/g.exec(findAccent[1])[1]);
		document.documentElement.style.setProperty('--text', dark ? '#707A8C' : '#5b6371');
	});
  if(update) {request('setAccount', {key:'prefrences',value: user.prefrences}, function(data) {if(data !== true) {notification('Failed to set prefrences in database');}});}
}

//Popup
var popupTimeout;
function popup(head,msg,btns,fns,large) {
	clearTimeout(popupTimeout);
	document.getElementById('popup').className = large ? "large" : '';
	document.getElementById('popup_head').textContent = head;
	document.getElementById('popup_msg').innerHTML = msg;
	document.getElementById('popup_buttons').innerHTML = '';
	if(!Array.isArray(btns)) {btns = [];}
	if(!Array.isArray(fns)) {fns = [];}
	btns.splice(0,0,'Close');
	fns.splice(0,0,closePopup);
	btns.forEach(function(text, index) {
		var btn = document.createElement('div');
		btn.className = 'popup_btn';
		btn.textContent = text;
		btn.onclick = function() {fns[index](tree.selected,this.parentNode.parentNode.querySelectorAll('input'));};
		document.getElementById('popup_buttons').appendChild(btn);
	});
	document.getElementById('shade').style.zIndex = 3;
	document.getElementById('shade').style.opacity = 1;
	document.getElementById('main').classList.add('blur');
	var input = document.getElementById('popup_msg').querySelector('input');
	if(input && !large) {setTimeout(function() {input.focus();},100);}
	if(document.getElementById('pref').classList.contains('open')) {togglePref();}
}
function closePopup() {
	clearTimeout(popupTimeout);
	menu.close(true);
	document.getElementById('shade').style.opacity = 0;
	document.getElementById('main').classList.remove('blur');
	popupTimeout = setTimeout(function() {
		document.getElementById('shade').style.zIndex = -1;
	}, 500);
}


//Notifications
var notifHeight = 0, notifs = [];
function notification(content,isHtml) { //CREATES A NOTIFCATION
	var n = document.createElement('div');
	n.className = 'notification';
	n.onclick = function() {closeNotification(this);}
	var d = document.createElement('div');
	n.appendChild(d);
	if(isHtml) {d.innerHTML = content;}
	else {d.textContent = content;}
	document.body.appendChild(n);
	notifs.push(n);
	var height = n.offsetHeight + 10;
	n.style.bottom = "calc(100% - " + height + "px)";
	notifHeight += height;
	fixNotifications();
	setTimeout(function() {closeNotification(n);}, 5000);
}
function closeNotification(elem) {
	if(!elem  || notifs.indexOf(elem) === -1) {return;}
	notifHeight -= (elem.offsetHeight+10);
	elem.style.right = -(elem.offsetWidth+10)+"px";
	notifs.splice(notifs.indexOf(elem),1);
	setTimeout(function() {elem.remove();}, 500);
	setTimeout(function() {fixNotifications();}, 200);
}
function fixNotifications() {
	var height = notifHeight;
	notifs.forEach(function(n) {
		n.style.bottom = "calc(100% - " + height + "px)";
		height -= (n.offsetHeight + 10);
	});
}

//Features menu
function toggleFeatures() {
	document.getElementById('features').classList.toggle('open');
	document.getElementById('tree').classList.toggle('blur2');
	document.getElementById('sidebarHead').classList.toggle('blur2');
}

//Find files
function toggleFind(open) {
	if(!document.getElementById('fileSearch').classList.contains('open') || open) {
		document.getElementById('fileSearch').classList.add('open');
		document.getElementById('fileSearch').focus();
		document.getElementById('fileSearch').setSelectionRange(0,document.getElementById('fileSearch').value.length);
		if(document.getElementById('favWrap').style.display === 'block') {toggleFavorites();}
		if(document.getElementById('features').classList.contains('open')) {toggleFeatures();}
	}
	else {
		document.getElementById('fileSearch').classList.remove('open');
		document.getElementById('fileSearch').blur();
		tree.elem.querySelectorAll('.tmp').forEach(function(elem) {
			elem.classList.remove('tmp');
		});
		setCookie('opened', JSON.stringify(tree.opened));
	}
	tree.clearHighlight();
}

//Dropdown
function manageDropdowns() {
	var dropdowns = document.getElementsByTagName('dropdown');
	for(var i = 0;i<dropdowns.length;i++) {
		var input = dropdowns[i].children[0];
		if(dropdowns[i].parentNode.classList.contains('pref')) {
			var items = dropdowns[i].children[2].children;
			for(var j = 0;j<items.length;j++) {
				items[j].onmousedown = function(e) {
					setDropdown(this);
					setOpt(this.parentNode.previousElementSibling.previousElementSibling);
				}
			}
		}
		input.onfocus = function() {this.setSelectionRange(0,this.value.length);}
		input.oninput = function() {findItem(this);}
		input.onkeydown = function(e) {if(e.keyCode === 13){findItem(this,true);}};
		input.onblur = function() {findItem(this,true);}
	}
}
function findItem(input,select) {
	var values = input.nextElementSibling.nextElementSibling.children;
	var search = new RegExp('^'+input.value, 'gim');
	var found = false;
	for(var j = 0;j<values.length;j++) {
		if(search.test(values[j].textContent) || search.test(values[j].dataset.value)) {
			found = values[j];
			input.nextElementSibling.nextElementSibling.scrollTop = found.offsetTop;
			break;
		}
	}
	if(!found) {found = values[0];}
	if(select) {
		setDropdown(found);
		setOpt(input);
		input.blur();
	}
}
function setDropdown(elem) {
	var others = elem.parentNode.children;
	for(var j = 0;j<others.length;j++) {
		others[j].removeAttribute("class");
	}
	var input = elem.parentNode.parentNode.children[0];
	elem.className = 'selected';
	input.value = elem.textContent;
	input.dataset.value = elem.dataset.value;
}
function assignDropdown(dropdown, str) {
	var options = dropdown.children[2].children;
	if(typeof str !== "string") {str = str.toString();}
	for(var i = 0;i<options.length;i++) {
		if(options[i].textContent.toLowerCase() === str.toLowerCase()) {
			options[i].className = "selected";
			str = options[i].textContent;
		}
		else {
			options[i].removeAttribute("class");
		}
	}
	dropdown.children[0].value = str;
}

//Prefrences
function togglePref(open) {
	if(document.getElementById('pref').classList.contains('open') && open !== true) {
		document.getElementById('main').classList.remove('blur');
		document.getElementById('pref').classList.remove('open');
	}
	else {
		closePopup();
		document.getElementById('pref').classList.add('open');
		document.getElementById('main').classList.add('blur');
	}
}
function prefTab(tab) {
	var prev = document.getElementById('pref').querySelector('.active');
	if(prev) {prev.classList.remove('active');}
	document.getElementById(tab).classList.add('active');
}
function setOpt(elem) {
	var data = elem.id.split('_');
	if(elem.type === 'text') {
		if(elem.id === 's_theme') {setTheme(elem.dataset.value || elem.value,true);return;}
		data[0] === 'p' ? user.prefrences[data[1]] = elem.value : user.settings[data[1]] = elem.value;
	}
	else if(elem.type === 'number') {
		data[0] === 'p' ? user.prefrences[data[1]] = elem.value + "px" : user.settings[data[1]] = elem.value + "px";
	}
	else {
		if(data[1] === 'scrollPastEnd') {user.prefrences[data[1]] = elem.checked ? .4 : 0;}
		else {
			data[0] === 'p' ? user.prefrences[data[1]] = elem.checked : user.settings[data[1]] = elem.checked;
		}
	}
	if(data[1] === 'uiFont' || data[1] === 'fontFamily') {linkFont(data.join('_'),elem.value);}
	data[0] === 'p' ? applyPref() : applySettings();
	if(data[0] === 'p') {
	  request('setAccount', {key:'prefrences',value: user.prefrences}, function(data) {
	  	if(data !== true) {notification('Failed to set prefrences in database');}
	  });
	}
	else if(data[0] === 's') {
	  request('setAccount', {key:'settings',value: user.settings}, function(data) {
	  	if(data !== true) {notification('Failed to set settings in database');}
	  });
	}
}
function setPref(key,val) {
	if(user.prefrences[key] === val) {return;}
	key = key.split('_');
	key[0] === 'p' ? user.prefrences[key[1]] = val : user.settings[key[1]] = val;
	key[0] === 'p' ? applyPref() : applySettings();
	updatePref();
	request('setAccount', {key:'prefrences',value: user.prefrences}, function(data) {
  	if(data !== true) {notification('Failed to set prefrences in database');}
  });
}
function applyPref() {
	for(var i = 0;i < user.panels.length;i++) {
		for(var j = 0;j < user.panels[i].editors.length;j++) {
			user.panels[i].editors[j].setOptions(user.prefrences);
		}
	}
}
function applySettings() {
	document.documentElement.style.setProperty('--font', user.settings.uiFont);
	document.documentElement.style.setProperty('--line-height', user.settings.lineHeight);
}
function linkFont(pref, face) {
	pref === 'p_fontFamily' ? document.documentElement.style.setProperty('--editorfont', face) : document.documentElement.style.setProperty('--font', face);
	document.getElementById('font_'+pref).innerHTML = '@font-face {font-family: '+face+';src: url(lib/fonts/'+face.replace(/ /g, '_')+'.ttf);font-weight: 400;}@font-face {font-family: '+face+';src: url(lib/fonts/'+face.replace(/ /g, '_')+'_light.ttf);font-weight: 300;}';
}
function updatePref() {
	var prefs = Object.assign({}, user.prefrences, user.settings);
	Object.keys(prefs).forEach(function(pref) {
		var elem = document.getElementById('ptabSet').querySelector('#p_'+pref+',#s_'+pref);
		if(elem) {
			if(elem.tagName.toLowerCase() === 'input' && elem.type === 'text') {
				if(pref === 'theme') {prefs[pref] = prefs[pref].replace('ace/theme/', '').replace(/(-|_)/g, ' ');}
				assignDropdown(elem.parentNode,prefs[pref]);
			}
			else if(elem.type === 'number') {elem.value = parseFloat(prefs[pref]);}
			else {elem.checked = prefs[pref];}
		}
	});
}

//Frames
var frames = {
	'flaticon': 'https://www.flaticon.com',
	'sketch': 'lib/sketch/sketch.html',
}
var frameTimeout;
function createFrame(name,url) {
	var frame = document.createElement('iframe');
	frame.src = url;
	frame.id = "frame_"+name;
	document.getElementById('frames').appendChild(frame);
}
function toggleFrame(frame) {
	if(frames[frame] && !document.getElementById("frame_"+frame)) {createFrame(frame,frames[frame]);}
	if(frame || !document.getElementById('frames').classList.contains('open')) {
		document.getElementById('frames').classList.add('open');
		document.getElementById('frames').style.zIndex = "4";
		var active = document.getElementById('frames').querySelector('.active');
		if(active) {active.classList.remove('active');}
		document.getElementById("frame_"+frame).classList.add('active');
	}
	else {
		document.getElementById('frames').classList.remove('open');
		frameTimeout = setTimeout(function() {document.getElementById('frames').style.zIndex = "-1";},500);
	}
}

// CHAT
var chatTimeout, messages = [];
function toggleChat() {
	clearTimeout(chatTimeout);
	var elem = document.getElementById('chat');
	if(elem.classList.contains('open')) {
		elem.classList.remove('open');
		elem.style.transition = '.4s bottom';
		elem.style.bottom = -(elem.offsetHeight+10)+"px";
		document.getElementById('chatInput').blur();
		chatTimeout = setTimeout(function() {elem.style.display = 'none';}, 400);
	}
	else {
		elem.style.transition = 'none';
		elem.classList.add('open');
		elem.style.display = 'flex';
		elem.style.bottom = -(elem.offsetHeight+10)+"px";
		setTimeout(function() {elem.style.transition = '.4s bottom';elem.style.bottom = '10px';}, 10);
		chatTimeout = setTimeout(function() {document.getElementById('chatInput').focus();}, 400);		
	}
}
function updateChat(chat) {
	document.getElementById('messages').innerHTML = "";
	if(messages !== chat) {
		if(!document.getElementById('chat').classList.contains('open') && !firstTime) {
			var newMsg = chat[chat.length-1];
			if(user.settings.chatSound) {playSound('ding.mp3');}
			if(user.settings.chatNotification) {notification('<span style="display:block;font-size: .6em;">'+newMsg.name+'</span>'+decodeURIComponent(newMsg.msg),true);}
		}
		messages = chat;
		messages.forEach(function(msg) {
			var elem = document.createElement('div');
			elem.className = 'message';
			elem.innerHTML = '<h2 onclick="User.displayInfo(\''+msg.sender+'\')"></h2><br><span></span><time></time>';
			document.getElementById('messages').appendChild(elem);
			elem.children[0].textContent = msg.name;
			elem.children[2].textContent = decodeURIComponent(msg.msg);
			elem.children[3].textContent = formatDate(msg.time);
			if(msg.sender === user.sqlid) {elem.classList.add('own');}
		});
		document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
	}
	if(chat.length === 0) {
		document.getElementById('messages').innerHTML = "<center>No Messages</center>";
	}
	if(!document.getElementById('chat').classList.contains('open')) {
		document.getElementById('chat').style.transition = "none";
		document.getElementById('chat').style.bottom = -(document.getElementById('chat').offsetHeight+10) + "px";
	}
	firstTime = false;
}
function sendChat(input) {
	if(input.value.replace(/\s/g, '') !== '') {
		socket.emit('chat', input.value);
		input.value = '';
		input.removeAttribute('style');
	}
}
function fitText(elem) {
	elem.removeAttribute('style');
	elem.style.height = elem.scrollHeight + "px";
}

//Color Pickier
var color, hue, alpha = 1, editColor, colorType = "hex",dragColor;
var colorscape, cs, huescale, ch;
function colorInitalize() {
  colorscape = document.getElementById("colorscape");
  cs = colorscape.getContext("2d");
  huescale = document.getElementById("huescape");
  ch = huescale.getContext("2d");
  var g = ch.createLinearGradient(0,0,0,huescale.height);
  g.addColorStop(0,"red");
  g.addColorStop(.1667,"yellow");
  g.addColorStop(.3333,"lime");
  g.addColorStop(.50,"aqua");
  g.addColorStop(.6667,"blue");
  g.addColorStop(.8333,"fuchsia");
  g.addColorStop(1,"red");
  ch.fillStyle = g;
  ch.fillRect(0,0,huescale.width,huescale.height);
  setGradient(pickupColor(ch,document.getElementById("hueMarker")));
  document.getElementById("alphaMarker").style.top = document.getElementById("alphascape").offsetHeight - document.getElementById("alphascape").offsetHeight *alpha;
  updateSwatches();
}

function setColor(c,set) {
  var tc = tinycolor(c);
  if(tc.isValid()) {
    tc.setAlpha(alpha);
    color = tc.toRgbString();
    if(colorType === 'hex') {document.getElementById("colorValue").value = alpha === 1 ? tc.toHexString() : tc.toHex8String();}
    if(colorType === 'rgb') {document.getElementById("colorValue").value = color;}
    if(colorType === 'hsl') {document.getElementById("colorValue").value = tc.toHslString();}
    document.getElementById("colorinput").value = tc.toHexString();
    document.getElementById("colorPreview").style.backgroundImage = 'linear-gradient('+color+' 0%, '+color+' 100%), var(--transparent)';
    document.getElementById("alphascape").style.backgroundImage = 'linear-gradient(to bottom, '+tc.toHexString()+' 0%, rgba(255,255,255,0) 100%), var(--transparent)';
  }
}
function setColorType(item) {
	if(item.parentNode.querySelector('.selected')) {
		item.parentNode.querySelector('.selected').className = "";
	}
	item.className = 'selected';
	document.getElementById('colorType').value = item.textContent;
	colorType = item.textContent.toLowerCase();
	setColor(color);
}
function setGradient(c,dontUpdate) {
  hue = c;
  cs.clearRect(0,0,cs.canvas.width,cs.canvas.height);
  cs.fillStyle = c;
  cs.fillRect(0,0,cs.canvas.width,cs.canvas.height);
  var value = cs.createLinearGradient(0,0,0,cs.canvas.height);
  value.addColorStop(.01,"rgba(0,0,0,0)");
  value.addColorStop(.99,"black");
  var saturation = cs.createLinearGradient(0,0,cs.canvas.width,0);
  saturation.addColorStop(.01,"white");
  saturation.addColorStop(.99,"rgba(255,255,255,0)");
  cs.fillStyle = saturation;
  cs.fillRect(0,0,cs.canvas.width,cs.canvas.height);
  cs.fillStyle = value;
  cs.fillRect(0,0,cs.canvas.width,cs.canvas.height);
  if(dontUpdate !== true) {setColor(pickupColor(cs,document.getElementById("shadeMarker")));}
}

function selectColor(elem) {
  var marker = document.getElementById(elem.dataset.marker);
  marker.style.top = my - elem.getBoundingClientRect().top + "px";
  marker.style.left = mx - elem.getBoundingClientRect().left + "px";
  var height = elem.height || elem.offsetHeight; width = elem.width || elem.offsetWidth;
  if(marker.offsetTop <= 0) {marker.style.top = "0px";}
  if(marker.offsetTop >= height) {marker.style.top = height-1 + "px";}
  if(marker.offsetLeft <=  0) {marker.style.left = "0px";}
  if(marker.offsetLeft >= width) {marker.style.left = width-1 + "px";}
  if(elem.id == "colorscape") {
    setColor(pickupColor(cs,marker));
  }
  else if(elem.id == "huescape") {
    setGradient(pickupColor(ch,marker));
  }
  else if(elem.id == "alphascape") {
    if(marker.offsetTop === height -1) {alpha = 0;}
    else {alpha = (height - marker.offsetTop)/height;}
    setColor(color);
  }
}
var pickerTimeout;
function togglePicker(open) {
	clearTimeout(pickerTimeout);
	if(open !== true && document.getElementById('colorpicker').classList.contains('open')) {
		document.getElementById('colorpicker').classList.remove('open');
		pickerTimeout = setTimeout(function() {document.getElementById('colorpicker').style.zIndex = "-1"},500);
	}
	else {
		document.getElementById('colorpicker').classList.add('open');
		document.getElementById('colorpicker').style.zIndex = "2";
	}
}
function movePicker(e) {
	var x = mx - e.detail.offset.x, y = my - e.detail.offset.y;
	if(x < 5) {x = 5;}
	if(x > document.body.offsetWidth-5-this.offsetWidth) {x = document.body.offsetWidth-5-this.offsetWidth;}
	if(y < 5) {y = 5;}
	if(y > window.innerHeight-5-this.offsetHeight) {y = window.innerHeight-5-this.offsetHeight;}
	this.parentNode.style.left = x + "px";
	this.parentNode.style.top = y + "px";
}

function pickupColor(ctx,marker) {
  var data = ctx.getImageData(marker.offsetLeft,marker.offsetTop,1,1).data;
  return 'rgb('+data[0]+','+data[1]+','+data[2]+')';
}
function addSwatch(c) {
  if(user.colors.indexOf(c) === -1) {
    user.colors.unshift(c);
    updateSwatches();
    setServerColors();
  }
}
function updateSwatches() {
  document.getElementById("swatches").innerHTML = "";
  if(user.colors.length > 0) {document.getElementById("swatches").style.display = "flex";}
  else {document.getElementById("swatches").style.display = "none";}
  for(var i = 0;i<user.colors.length;i++) {
    document.getElementById("swatches").innerHTML += '<div class="swatch" onmousedown="if(event.which === 3) {deleteSwatch(\''+user.colors[i]+'\')}" onclick="inputColor(\''+user.colors[i]+'\')" style="background-image: linear-gradient('+user.colors[i]+' 100%, '+user.colors[i]+' 100%), var(--transparent);"></div>';
  }
}
function deleteSwatch(color) {
  user.colors.splice(user.colors.indexOf(color),1);
  updateSwatches();
  setServerColors();
}
function setServerColors() {
  request('setAccount', {key:'colors',value: user.colors}, function(data) {
  	if(data !== true) {notification('Failed to set colors in database');}
  });
}
function inputColor(c) {
  c = tinycolor(c);
  if(c.isValid()) {
    alpha = c.getAlpha();
    setColor(c);
    var hsv = c.toHsv();
    document.getElementById("hueMarker").style.top = Math.round(hsv.h/360*huescale.height) + "px";
    setGradient(pickupColor(ch,document.getElementById("hueMarker")),true);
    var x = Math.round(hsv.s * (colorscape.width))-1;
    var y = Math.round((1-hsv.v) * (colorscape.height));
    var marker = document.getElementById("shadeMarker");
    marker.style.top = y + "px";
    marker.style.left = x + "px";
    document.getElementById("alphaMarker").style.top = document.getElementById("alphascape").offsetHeight*(1-alpha) + "px";
  }
}

//Favorites
function toggleFavorites(open) {
	if(document.getElementById('tree').style.display !== 'none' || open) {
		document.getElementById('tree').style.display = 'none';
		document.getElementById('favWrap').style.display = 'block';
	}
	else {
		document.getElementById('favWrap').style.display = 'none';
		document.getElementById('tree').style.display = 'block';
	}
}
function toggleFavorite(path) {
	if(path in user.favorites) {
		delete user.favorites[path];
	}
	else {
		user.favorites[path] = null;
	}
	request('setAccount', {key:'favorites',value: Object.keys(user.favorites)}, function(data) {
		if(data !== true) {notification('Failed to set favorites in database');}
	});
}
function updateFavorites() {
	document.getElementById('favorites').innerHTML = '<div class="back favback"><span onclick="toggleFavorites()">'+svg.arrow+'Back To Files</span></div>';
	tree.elem.querySelectorAll('.favorite').forEach(function(elem) {elem.classList.remove('favorite');});
	Object.keys(user.favorites).length > 0 ? (Object.values(user.favorites).forEach(function(file) {
		var elem = tree.elem.querySelector('[data-path="'+file.path+'"]');
		if(elem) {elem.classList.add('favorite');}
		var cls = tree.selected.indexOf(file.path) > -1 ? 'selected' : '';
		if(file.ext !== 'directory') {
			document.getElementById('favorites').innerHTML += '<div class="file favorite" data-rel="'+file.rel+'" data-path="'+file.path+'"><span class="'+cls+'" onmouseup="tree.mouseUp(event,this);" onmousedown="tree.mouseDown(event,this);"><img src="lib/icons/file_type_'+Tree.pickImg(file.path)+'@2x.png" />' + file.basename+'</span><dummy></dummy>'+svg.star+'</div>';
		}
		else {
			document.getElementById('favorites').innerHTML += '<div class="file favorite" data-rel="'+file.rel+'" data-path="'+file.path+'"><span class="'+cls+'" onmouseup="if(this.dataset.allowAction === \'true\') {tree.setRoot(\''+file.path+'\',toggleFavorites());}" onmousedown=\"tree.mouseDown(event,this);\">'+svg.folder + file.basename+'</span><dummy></dummy>'+svg.star+'</div>';
		}
	})) : document.getElementById('favorites').innerHTML += "<div class='back'><span style='padding-left:21px;color:var(--activetext) !important;cursor:default;'>No Favorited Files</span></div>";
}

//Helpers 
function formatSize(size) {
  if (size > 1000000000) {
    return (size / 1000000000.0).toPrecision(3) + " GB";
  } 
  else if (size > 1000000) {
    return (size / 1000000.0).toPrecision(3) + " MB";
  } 
  else if (size > 1000) {
    return (size / 1000.0).toPrecision(3) + " KB";
  } 
  else {
    return size + " bytes"
  }
}
function formatDate(date) {
  var d = new Date(date);
  var local = new Date();
  var diem = d.getHours() / 12 >= 1 ? 'PM' : 'AM';
  var hrs = d.getHours() > 12 ? d.getHours() % 12 : d.getHours();
  if(hrs === 0) {hrs = 12;}
  return leadingZero(hrs) + ':' + leadingZero(d.getMinutes()) + ' ' + diem + '    ' + leadingZero(d.getMonth()+1) + '/' + leadingZero(d.getDate()) + '/' + d.getFullYear();
}
function leadingZero(num) {
  return num.toString().length === 1 ? '0'+num : num;
}
function filter(input,type) { //FILTERS INPUT VALUES
  if(typeof input === 'string') {input = document.getElementById(input);}
  var cursor = input.selectionStart;
  var len = input.value.length;
  if(type.indexOf("number") > -1) {
    input.value = input.value.replace(/((?![0-9.]).)*/g,"");
  }
  if(type.indexOf('file') > -1) {
    input.value = input.value.replace(/[\\]/gi, "");
  }
  if(type.indexOf('required') > -1 && input.value.replace(/ /g, '') === "") {
    input.value = "Untitled";
  }
  if(type.indexOf('positive') > -1 && parseFloat(input.value) < 0) {
    input.value = 0;
  }
  if(len !== input.value.length) {
    input.setSelectionRange(cursor, cursor-1);
  }
}
function playSound(src) {
	var elem = document.createElement('audio');
	elem.className = 'hidden';
	elem.autoplay = true;
	elem.innerHTML = '<source src="lib/sounds/'+src+'" />';
	elem.onended = function() {this.remove();}
	document.body.appendChild(elem);
}

//RESIZER
class Resizer {
	constructor(parent,dir,absolute,snap) {
		var self = this;
		this.elem = document.createElement('div');
		this.elem.className = 'resizer ' + dir;
		parent.appendChild(this.elem)
		this.elem.onmousedown = function() {resizer = self;}
		this.parent = parent;
		this.dir = dir;
		this.abs = absolute;
		this.snap = snap;
		this.threshold = 10;
	}
	moveTo(x,y) {
		if(this.abs) {
			if(mx > this.parent.parentNode.offsetWidth) {mx = this.parent.parentNode.offsetWidth;}
			if(my > this.parent.parentNode.offsetHeight) {my = this.parent.parentNode.offsetHeight;}
			this.parent.nextElementSibling.style.transition = this.parent.style.transition = 'none';
			this.parent.style.display = 'block';
			this.parent.nextElementSibling.style.display = 'flex';
			if(this.dir === 'vert') {
				var x = mx;
				if(this.snap && Math.abs(this.snap - x) < this.threshold) {x = this.snap;}
				this.parent.style.left = "0px";
				this.parent.style.width = x + "px";
				this.parent.nextElementSibling.style.left = this.parent.offsetWidth + "px";
				this.parent.nextElementSibling.style.width = 'calc(100% - ' + this.parent.offsetWidth + "px)";
				if(this.parent.offsetWidth < 10) {document.getElementById('fullScreenArrow').classList.add('active');}
				else {document.getElementById('fullScreenArrow').classList.remove('active');}
			}
			else {
				var y = my;
				if(this.snap && Math.abs(this.snap - y) < this.threshold) {y = this.snap;}
				this.parent.style.top = "0px";
				this.parent.style.height = y + "px";
				this.parent.nextElementSibling.style.top = this.parent.offsetHeight + "px";
				this.parent.nextElementSibling.style.height = 'calc(100% - ' + this.parent.offsetHeight + "px)";
			}
			if(this.parent.offsetWidth >= document.body.offsetWidth-10 || this.parent.offsetWidth < 10) {
				document.getElementById('fullScreenArrow').style.display = 'block';
			}
			else {
				document.getElementById('fullScreenArrow').style.display = 'none';
			}
		}
		else {
			var offset = this.parent.parentNode.getBoundingClientRect();
			if(this.snap && Math.abs(this.snap - val) < this.threshold) {val = this.snap;}
			if(this.dir === 'hor') {
				var val = my - offset.y;
				if(val > this.parent.parentNode.offsetHeight) {val = this.parent.parentNode.offsetHeight;}
				else if(val < 0) {val = 0;}
				this.parent.parentNode.style.grid = val + "px" + " auto / 1fr";
			}
			else {
				var val = mx - offset.x;
				if(val > this.parent.parentNode.offsetWidth) {val = this.parent.parentNode.offsetWidth;}
				else if(val < 0) {val = 0;}
				this.parent.parentNode.style.grid = "1fr / " + val + "px" + " auto";
			}
		}
	}
	remove() {
		this.elem.remove();
	}
}
var fullScreenTimer;
function fullScreenToggle(showEditor) {
	clearTimeout(fullScreenTimer);
	document.getElementById('sidebar').style.transition = document.getElementById('content').style.transition = 'left .5s, width .5s linear';
	document.getElementById('sidebar').style.width = '100%';
	document.getElementById('content').style.width = '100%';
	document.getElementById('content').style.display = 'flex';
	document.getElementById('sidebar').style.display = 'block';	
	if(document.getElementById('content').offsetLeft > document.body.offsetWidth-10 && showEditor === undefined || showEditor) {
		document.getElementById('content').style.left = '0';
		document.getElementById('sidebar').style.left = '-100%';
		document.getElementById('fullScreenArrow').classList.add('active');
	}
	else {
		document.getElementById('sidebar').style.left = '0';
		document.getElementById('content').style.left = '100%';
		document.getElementById('fullScreenArrow').classList.remove('active');
		fullScreenTimer = setTimeout(function() {document.getElementById('content').style.display = 'none';}, 500);
	}
}


var svg = {
	logo: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1"viewBox="0 0 64 64"><path d="M64 32C64 49.66 49.66 64 32 64C14.34 64 0 49.66 0 32C0 14.34 14.34 0 32 0C49.66 0 64 14.34 64 32Z"/><path d="M47.83 13.86C36.91 19.82 26.37 31.88 25.85 32.3C25.33 32.73 28.58 30.5 28.59 30.75C25.19 33.79 22.52 38.13 21.22 40.35C19.44 42.51 19.68 48.46 19.94 47.56C20.11 46.95 20.31 46.59 20.55 46.48C20.56 46.65 20.56 46.74 20.55 46.74C20.54 46.74 20.78 46.27 20.67 46.9C20.2 49.59 24.31 50.64 24.66 50.39C25.02 50.14 19.88 52.45 18.58 51.92C17.28 51.39 16.95 51.6 16.27 51.32C15.81 51.13 15.44 50.7 15.16 50.01C15.16 50.01 15.16 50.01 15.16 50.01C15.29 49.94 15.36 49.79 15.33 49.64C15.31 49.53 15.1 49.06 14.69 48.23C13.98 46.78 13.49 45.77 13.74 44.07C15.62 31.6 26.55 23.45 25.95 24.13C25.56 24.58 23.98 26.79 21.22 30.75C22.71 28.99 25.85 26.05 30.64 21.93C35.43 17.8 41.94 14.5 50.17 12.02C50.69 11.87 49.91 12.49 47.83 13.86Z"/></svg>`,
	arrow: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 492.004 492.004"><path d="M382.678,226.804L163.73,7.86C158.666,2.792,151.906,0,144.698,0s-13.968,2.792-19.032,7.86l-16.124,16.12c-10.492,10.504-10.492,27.576,0,38.064L293.398,245.9l-184.06,184.06c-5.064,5.068-7.86,11.824-7.86,19.028c0,7.212,2.796,13.968,7.86,19.04l16.124,16.116c5.068,5.068,11.824,7.86,19.032,7.86s13.968-2.792,19.032-7.86L382.678,265c5.076-5.084,7.864-11.872,7.848-19.088C390.542,238.668,387.754,231.884,382.678,226.804z"/></svg>`,
	folder: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 60 60"><path d="M57.49,21.5H54v-6.268c0-1.507-1.226-2.732-2.732-2.732H26.515l-5-7H2.732C1.226,5.5,0,6.726,0,8.232v43.687l0.006,0  c-0.005,0.563,0.17,1.114,0.522,1.575C1.018,54.134,1.76,54.5,2.565,54.5h44.759c1.156,0,2.174-0.779,2.45-1.813L60,24.649v-0.177  C60,22.75,58.944,21.5,57.49,21.5z M2,8.232C2,7.828,2.329,7.5,2.732,7.5h17.753l5,7h25.782c0.404,0,0.732,0.328,0.732,0.732V21.5  H12.731c-0.144,0-0.287,0.012-0.426,0.036c-0.973,0.163-1.782,0.873-2.023,1.776L2,45.899V8.232z M47.869,52.083  c-0.066,0.245-0.291,0.417-0.545,0.417H2.565c-0.243,0-0.385-0.139-0.448-0.222c-0.063-0.082-0.16-0.256-0.123-0.408l10.191-27.953  c0.066-0.245,0.291-0.417,0.545-0.417H54h3.49c0.38,0,0.477,0.546,0.502,0.819L47.869,52.083z"/></svg>`,
	add: `<svg viewBox="0 0 448 448" xmlns="http://www.w3.org/2000/svg"><path d="m408 184h-136c-4.417969 0-8-3.582031-8-8v-136c0-22.089844-17.910156-40-40-40s-40 17.910156-40 40v136c0 4.417969-3.582031 8-8 8h-136c-22.089844 0-40 17.910156-40 40s17.910156 40 40 40h136c4.417969 0 8 3.582031 8 8v136c0 22.089844 17.910156 40 40 40s40-17.910156 40-40v-136c0-4.417969 3.582031-8 8-8h136c22.089844 0 40-17.910156 40-40s-17.910156-40-40-40zm0 0"/></svg>`,
	compress: `<svg viewBox="-48 0 448 448" xmlns="http://www.w3.org/2000/svg"><path d="m158.863281 272-10.703125 69.601562c-.699218 4.613282.648438 9.300782 3.691406 12.835938 3.046876 3.539062 7.480469 5.570312 12.148438 5.5625h24c4.660156 0 9.089844-2.035156 12.128906-5.570312 3.039063-3.535157 4.386719-8.21875 3.6875-12.828126l-10.679687-69.601562zm25.136719 72h-16v-16h16zm0 0"/><path d="m168 224h-16v32h48v-32h-16v16h-16zm0 0"/><path d="m184 0v16h24v16h-24v16h24v16h-24v16h24v16h-24v16h24v16h-24v16h24v16h-24v16h24v16h-24v16h24c4.417969 0 8 3.582031 8 8v48c-.03125 3.878906-2.875 7.164062-6.710938 7.742188l10.398438 67.394531c1.421875 9.238281-1.269531 18.636719-7.359375 25.722656-6.09375 7.089844-14.980469 11.15625-24.328125 11.140625h-24c-9.335938 0-18.207031-4.074219-24.289062-11.160156-6.078126-7.085938-8.761719-16.476563-7.34375-25.703125l10.402343-67.394531c-3.859375-.554688-6.734375-3.84375-6.769531-7.742188v-48c0-4.417969 3.582031-8 8-8h24v-16h-24v-16h24v-16h-24v-16h24v-16h-24v-16h24v-16h-24v-16h24v-16h-24v-16h24v-16h-24v-16h24v-16h-88v72c0 4.417969-3.582031 8-8 8h-72v368h352v-448zm0 0"/><path d="m64 11.3125-52.6875 52.6875h52.6875zm0 0"/></svg>`,
	extract: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 472.615 472.615"><polygon points="228.106,63.723 167.385,0 0,0 0,130.837 472.615,130.837 472.615,63.723"/><path d="M266.17,150.529h-29.874v19.692h29.874v19.692h-29.874v19.692h29.874v19.692h-29.874v19.692h29.874v19.692h-29.874v19.692H206.43v-19.692h29.866v-19.692H206.43v-19.692h29.866v-19.692H206.43v-19.692h29.866v-19.692H206.43v-19.692H0v160.122v161.964h236.308h236.308V310.651V150.529H266.17z M265.831,355.043c0,16.344-13.194,29.538-29.538,29.538c-16.246,0-29.539-13.195-29.539-29.538v-53.27h59.077V355.043z"/></svg>`,
	download: `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 56 56"><path d="M35.586,41.586L31,46.172V28c0-1.104-0.896-2-2-2s-2,0.896-2,2v18.172l-4.586-4.586c-0.781-0.781-2.047-0.781-2.828,0s-0.781,2.047,0,2.828l7.999,7.999c0.093,0.094,0.196,0.177,0.307,0.251c0.047,0.032,0.099,0.053,0.148,0.081c0.065,0.036,0.127,0.075,0.196,0.103c0.065,0.027,0.133,0.042,0.2,0.062c0.058,0.017,0.113,0.04,0.173,0.051C28.738,52.986,28.869,53,29,53s0.262-0.014,0.392-0.04c0.06-0.012,0.115-0.034,0.173-0.051c0.067-0.02,0.135-0.035,0.2-0.062c0.069-0.028,0.131-0.067,0.196-0.103c0.05-0.027,0.101-0.049,0.148-0.081c0.11-0.074,0.213-0.157,0.307-0.251l7.999-7.999c0.781-0.781,0.781-2.047,0-2.828S36.367,40.805,35.586,41.586z"/><path d="M47.835,18.986c-0.137-0.019-2.457-0.335-4.684,0.002C43.1,18.996,43.049,19,42.999,19c-0.486,0-0.912-0.354-0.987-0.85c-0.083-0.546,0.292-1.056,0.838-1.139c1.531-0.233,3.062-0.196,4.083-0.124C46.262,9.135,39.83,3,32.085,3C27.388,3,22.667,5.379,19.8,9.129C21.754,10.781,23,13.246,23,16c0,0.553-0.447,1-1,1s-1-0.447-1-1c0-2.462-1.281-4.627-3.209-5.876c-0.227-0.147-0.462-0.277-0.702-0.396c-0.069-0.034-0.139-0.069-0.21-0.101c-0.272-0.124-0.55-0.234-0.835-0.321c-0.035-0.01-0.071-0.017-0.106-0.027c-0.259-0.075-0.522-0.132-0.789-0.177c-0.078-0.013-0.155-0.025-0.233-0.036C14.614,9.027,14.309,9,14,9c-3.859,0-7,3.141-7,7c0,0.082,0.006,0.163,0.012,0.244l0.012,0.21l-0.009,0.16C7.008,16.744,7,16.873,7,17v0.63l-0.567,0.271C2.705,19.688,0,24,0,28.154C0,34.135,4.865,39,10.845,39H25V28c0-2.209,1.791-4,4-4s4,1.791,4,4v11h2.353c0.059,0,0.116-0.005,0.174-0.009l0.198-0.011l0.271,0.011C36.053,38.995,36.11,39,36.169,39h9.803C51.501,39,56,34.501,56,28.972C56,24.161,52.49,19.872,47.835,18.986z"/></svg>`,
	folder: `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 60 60"><path d="M26.515,10.5l-5-7H0v53h60v-37v-2v-7H26.515z M31.515,17.5l-3.571-5H58v5H31.515z"/></svg>`,
	link: `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512.092 512.092"><path d="M312.453,199.601c-6.066-6.102-12.792-11.511-20.053-16.128c-19.232-12.315-41.59-18.859-64.427-18.859c-31.697-0.059-62.106,12.535-84.48,34.987L34.949,308.23c-22.336,22.379-34.89,52.7-34.91,84.318c-0.042,65.98,53.41,119.501,119.39,119.543c31.648,0.11,62.029-12.424,84.395-34.816l89.6-89.6c1.628-1.614,2.537-3.816,2.524-6.108c-0.027-4.713-3.87-8.511-8.583-8.484h-3.413c-18.72,0.066-37.273-3.529-54.613-10.581c-3.195-1.315-6.867-0.573-9.301,1.877l-64.427,64.512c-20.006,20.006-52.442,20.006-72.448,0c-20.006-20.006-20.006-52.442,0-72.448l108.971-108.885c19.99-19.965,52.373-19.965,72.363,0c13.472,12.679,34.486,12.679,47.957,0c5.796-5.801,9.31-13.495,9.899-21.675C322.976,216.108,319.371,206.535,312.453,199.601z"/><path d="M477.061,34.993c-46.657-46.657-122.303-46.657-168.96,0l-89.515,89.429c-2.458,2.47-3.167,6.185-1.792,9.387c1.359,3.211,4.535,5.272,8.021,5.205h3.157c18.698-0.034,37.221,3.589,54.528,10.667c3.195,1.315,6.867,0.573,9.301-1.877l64.256-64.171c20.006-20.006,52.442-20.006,72.448,0c20.006,20.006,20.006,52.442,0,72.448l-80.043,79.957l-0.683,0.768l-27.989,27.819c-19.99,19.965-52.373,19.965-72.363,0c-13.472-12.679-34.486-12.679-47.957,0c-5.833,5.845-9.35,13.606-9.899,21.845c-0.624,9.775,2.981,19.348,9.899,26.283c9.877,9.919,21.433,18.008,34.133,23.893c1.792,0.853,3.584,1.536,5.376,2.304c1.792,0.768,3.669,1.365,5.461,2.048c1.792,0.683,3.669,1.28,5.461,1.792l5.035,1.365c3.413,0.853,6.827,1.536,10.325,2.133c4.214,0.626,8.458,1.025,12.715,1.195h5.973h0.512l5.12-0.597c1.877-0.085,3.84-0.512,6.059-0.512h2.901l5.888-0.853l2.731-0.512l4.949-1.024h0.939c20.961-5.265,40.101-16.118,55.381-31.403l108.629-108.629C523.718,157.296,523.718,81.65,477.061,34.993z"/></svg>`,
	pencil: `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 528.899 528.899"><path d="M328.883,89.125l107.59,107.589l-272.34,272.34L56.604,361.465L328.883,89.125z M518.113,63.177l-47.981-47.981c-18.543-18.543-48.653-18.543-67.259,0l-45.961,45.961l107.59,107.59l53.611-53.611C532.495,100.753,532.495,77.559,518.113,63.177z M0.3,512.69c-1.958,8.812,5.998,16.708,14.811,14.565l119.891-29.069L27.473,390.597L0.3,512.69z"/></svg>`,
	pipette: `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 464.736 464.736"><path d="M446.598,18.143c-24.183-24.184-63.393-24.191-87.592-0.008l-16.717,16.717c-8.98-8.979-23.525-8.979-32.504,0c-8.981,8.972-8.981,23.533,0,32.505l5.416,5.419L134.613,253.377h-0.016l-62.685,62.691c-4.982,4.982-7.919,11.646-8.235,18.684l-0.15,3.344c0,0.016,0,0.03,0,0.046l-2.529,56.704c-0.104,2.633,0.883,5.185,2.739,7.048c1.751,1.759,4.145,2.738,6.63,2.738c0.135,0,0.269,0,0.42-0.008l30.064-1.331h0.016l18.318-0.815l8.318-0.366c9.203-0.412,17.944-4.259,24.469-10.776l240.898-240.891l4.506,4.505c4.49,4.488,10.372,6.733,16.252,6.733c5.881,0,11.764-2.245,16.253-6.733c8.98-8.973,8.98-23.534,0-32.505l16.716-16.718C470.782,81.544,470.782,42.334,446.598,18.143z M272.639,227.33l-84.6,15.96l137.998-138.004l34.332,34.316L272.639,227.33z"/><path d="M64.5,423.872c-35.617,0-64.5,9.145-64.5,20.435c0,11.284,28.883,20.428,64.5,20.428s64.486-9.143,64.486-20.428C128.986,433.016,100.117,423.872,64.5,423.872z"/></svg>`,
	star: `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 55.867 55.867"><path d="M55.818,21.578c-0.118-0.362-0.431-0.626-0.808-0.681L36.92,18.268L28.83,1.876c-0.168-0.342-0.516-0.558-0.896-0.558s-0.729,0.216-0.896,0.558l-8.091,16.393l-18.09,2.629c-0.377,0.055-0.689,0.318-0.808,0.681c-0.117,0.361-0.02,0.759,0.253,1.024l13.091,12.76l-3.091,18.018c-0.064,0.375,0.09,0.754,0.397,0.978c0.309,0.226,0.718,0.255,1.053,0.076l16.182-8.506l16.18,8.506c0.146,0.077,0.307,0.115,0.466,0.115c0.207,0,0.413-0.064,0.588-0.191c0.308-0.224,0.462-0.603,0.397-0.978l-3.09-18.017l13.091-12.761C55.838,22.336,55.936,21.939,55.818,21.578z"/></svg>`,
	trash: `<svg viewBox="-48 0 407 407" xmlns="http://www.w3.org/2000/svg"><path d="m89.199219 37c0-12.132812 9.46875-21 21.601562-21h88.800781c12.128907 0 21.597657 8.867188 21.597657 21v23h16v-23c0-20.953125-16.644531-37-37.597657-37h-88.800781c-20.953125 0-37.601562 16.046875-37.601562 37v23h16zm0 0"/><path d="m60.601562 407h189.199219c18.242188 0 32.398438-16.046875 32.398438-36v-247h-254v247c0 19.953125 14.15625 36 32.402343 36zm145.597657-244.800781c0-4.417969 3.582031-8 8-8s8 3.582031 8 8v189c0 4.417969-3.582031 8-8 8s-8-3.582031-8-8zm-59 0c0-4.417969 3.582031-8 8-8s8 3.582031 8 8v189c0 4.417969-3.582031 8-8 8s-8-3.582031-8-8zm-59 0c0-4.417969 3.582031-8 8-8s8 3.582031 8 8v189c0 4.417969-3.582031 8-8 8s-8-3.582031-8-8zm0 0"/><path d="m20 108h270.398438c11.046874 0 20-8.953125 20-20s-8.953126-20-20-20h-270.398438c-11.046875 0-20 8.953125-20 20s8.953125 20 20 20zm0 0"/></svg>`,
	upload: `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 56 56"><path d="M37,36.5c0.512,0,1.024-0.195,1.414-0.586c0.781-0.781,0.781-2.047,0-2.828l-7.999-7.999c-0.093-0.093-0.196-0.177-0.306-0.25c-0.05-0.034-0.105-0.057-0.158-0.086c-0.062-0.034-0.121-0.071-0.186-0.098c-0.067-0.028-0.137-0.044-0.206-0.064c-0.056-0.017-0.11-0.038-0.168-0.05c-0.259-0.052-0.525-0.052-0.784,0c-0.058,0.011-0.112,0.033-0.168,0.05c-0.069,0.02-0.138,0.036-0.205,0.064c-0.066,0.027-0.125,0.065-0.187,0.099c-0.052,0.029-0.107,0.052-0.157,0.085c-0.11,0.073-0.213,0.157-0.306,0.25l-7.999,7.999c-0.781,0.781-0.781,2.047,0,2.828C19.976,36.305,20.488,36.5,21,36.5s1.024-0.195,1.414-0.586L27,31.328V49.5c0,1.104,0.896,2,2,2s2-0.896,2-2V31.328l4.586,4.586C35.976,36.305,36.488,36.5,37,36.5z"/><path d="M47.835,20.486c-0.137-0.019-2.457-0.335-4.684,0.002C43.1,20.496,43.049,20.5,42.999,20.5c-0.486,0-0.912-0.354-0.987-0.85c-0.083-0.546,0.292-1.056,0.838-1.139c1.531-0.233,3.062-0.196,4.083-0.124C46.262,10.635,39.83,4.5,32.085,4.5c-4.697,0-9.418,2.379-12.285,6.129c1.954,1.652,3.2,4.117,3.2,6.871c0,0.553-0.447,1-1,1s-1-0.447-1-1c0-2.462-1.281-4.627-3.209-5.876c-0.227-0.147-0.462-0.277-0.702-0.396c-0.069-0.034-0.139-0.069-0.21-0.101c-0.272-0.124-0.55-0.234-0.835-0.321c-0.035-0.01-0.071-0.017-0.106-0.027c-0.259-0.075-0.522-0.132-0.789-0.177c-0.078-0.013-0.155-0.025-0.233-0.036C14.614,10.527,14.309,10.5,14,10.5c-3.859,0-7,3.141-7,7c0,0.082,0.006,0.163,0.012,0.244l0.012,0.21l-0.009,0.16C7.008,18.244,7,18.373,7,18.5v0.63l-0.567,0.271C2.705,21.188,0,25.5,0,29.654C0,35.635,4.865,40.5,10.845,40.5h14.184v-4.343l-1.171,1.171c-0.781,0.781-1.805,1.172-2.829,1.172s-2.047-0.391-2.829-1.172c-1.562-1.562-1.562-4.095,0-5.656l8-8h0c0.186-0.186,0.391-0.352,0.61-0.499c0.098-0.065,0.205-0.111,0.307-0.167c0.126-0.069,0.248-0.146,0.382-0.201c0.132-0.055,0.27-0.086,0.406-0.126c0.114-0.033,0.223-0.077,0.34-0.101c0.517-0.103,1.05-0.103,1.567,0c0.118,0.023,0.227,0.067,0.34,0.101c0.136,0.04,0.274,0.071,0.406,0.126c0.134,0.056,0.256,0.132,0.382,0.201c0.102,0.056,0.209,0.101,0.307,0.167c0.219,0.146,0.424,0.313,0.61,0.499h0l8,8c1.562,1.562,1.562,4.095,0,5.656c-0.781,0.781-1.805,1.172-2.829,1.172s-2.047-0.391-2.829-1.172l-1.171-1.171V40.5h2.324c0.059,0,0.116-0.005,0.174-0.009l0.198-0.011l0.271,0.011c0.058,0.004,0.115,0.009,0.174,0.009h9.803C51.501,40.5,56,36.001,56,30.472C56,25.661,52.49,21.372,47.835,20.486z"/></svg>`,
	info: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 487.65 487.65"><path d="M243.824,0C109.163,0,0,109.163,0,243.833C0,378.487,109.163,487.65,243.824,487.65   c134.662,0,243.826-109.163,243.826-243.817C487.65,109.163,378.486,0,243.824,0z M243.762,103.634   c20.416,0,36.977,16.555,36.977,36.977c0,20.425-16.561,36.978-36.977,36.978c-20.424,0-36.986-16.553-36.986-36.978   C206.775,120.189,223.338,103.634,243.762,103.634z M307.281,381.228c0,3.695-2.995,6.691-6.684,6.691h-21.509h-70.663h-21.492   c-3.689,0-6.683-2.996-6.683-6.691v-13.719c0-3.694,2.993-6.689,6.683-6.689h21.492V230.706h-22.153   c-3.689,0-6.685-2.996-6.685-6.692V210.28c0-3.695,2.996-6.69,6.685-6.69h22.153h63.981h0.216c3.686,0,6.683,2.995,6.683,6.69   v150.539h21.293c3.688,0,6.684,2.995,6.684,6.689V381.228z"/></svg>`,
	code: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 94.504 94.504"><path d="M93.918,45.833L69.799,21.714c-0.75-0.75-2.077-0.75-2.827,0l-5.229,5.229c-0.781,0.781-0.781,2.047,0,2.828    l17.477,17.475L61.744,64.724c-0.781,0.781-0.781,2.047,0,2.828l5.229,5.229c0.375,0.375,0.884,0.587,1.414,0.587c0.529,0,1.039-0.212,1.414-0.587l24.117-24.118C94.699,47.881,94.699,46.614,93.918,45.833z"/><path d="M32.759,64.724L15.285,47.248l17.477-17.475c0.375-0.375,0.586-0.883,0.586-1.414c0-0.53-0.21-1.039-0.586-1.414    l-5.229-5.229c-0.375-0.375-0.884-0.586-1.414-0.586c-0.53,0-1.039,0.211-1.414,0.586L0.585,45.833c-0.781,0.781-0.781,2.047,0,2.829L24.704,72.78c0.375,0.375,0.884,0.587,1.414,0.587c0.53,0,1.039-0.212,1.414-0.587l5.229-5.229    C33.542,66.771,33.542,65.505,32.759,64.724z"/><path d="M60.967,13.6c-0.254-0.466-0.682-0.812-1.19-0.962l-4.239-1.251c-1.058-0.314-2.172,0.293-2.484,1.352L33.375,79.382    c-0.15,0.509-0.092,1.056,0.161,1.521c0.253,0.467,0.682,0.812,1.19,0.963l4.239,1.251c0.189,0.056,0.38,0.083,0.567,0.083c0.863,0,1.66-0.564,1.917-1.435l19.679-66.644C61.278,14.612,61.221,14.065,60.967,13.6z"/></svg>`,
	stat: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 55.867 55.867"><path d="M55.818,21.578c-0.118-0.362-0.431-0.626-0.808-0.681L36.92,18.268L28.83,1.876c-0.168-0.342-0.516-0.558-0.896-0.558s-0.729,0.216-0.896,0.558l-8.091,16.393l-18.09,2.629c-0.377,0.055-0.689,0.318-0.808,0.681c-0.117,0.361-0.02,0.759,0.253,1.024l13.091,12.76l-3.091,18.018c-0.064,0.375,0.09,0.754,0.397,0.978c0.309,0.226,0.718,0.255,1.053,0.076l16.182-8.506l16.18,8.506c0.146,0.077,0.307,0.115,0.466,0.115c0.207,0,0.413-0.064,0.588-0.191c0.308-0.224,0.462-0.603,0.397-0.978l-3.09-18.017l13.091-12.761C55.838,22.336,55.936,21.939,55.818,21.578z"/></svg>`,
	close: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 51.976 51.976"><path d="M44.373,7.603c-10.137-10.137-26.632-10.138-36.77,0c-10.138,10.138-10.137,26.632,0,36.77s26.632,10.138,36.77,0   C54.51,34.235,54.51,17.74,44.373,7.603z M36.241,36.241c-0.781,0.781-2.047,0.781-2.828,0l-7.425-7.425l-7.778,7.778   c-0.781,0.781-2.047,0.781-2.828,0c-0.781-0.781-0.781-2.047,0-2.828l7.778-7.778l-7.425-7.425c-0.781-0.781-0.781-2.048,0-2.828   c0.781-0.781,2.047-0.781,2.828,0l7.425,7.425l7.071-7.071c0.781-0.781,2.047-0.781,2.828,0c0.781,0.781,0.781,2.047,0,2.828   l-7.071,7.071l7.425,7.425C37.022,34.194,37.022,35.46,36.241,36.241z"/></svg>`,
	select: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve" width="512" height="512">
<g>
	<path d="M507.605,422.762l-87.503-87.517l42.422-42.422c3.677-3.677,5.186-8.994,3.999-14.048   c-1.201-5.068-4.922-9.141-9.858-10.781l-254.561-84.858c-5.376-1.846-11.338-0.381-15.352,3.618   c-4.014,4.014-5.42,9.961-3.618,15.352l84.858,254.561c1.641,4.937,5.713,8.657,10.781,9.858   c5.098,1.172,10.386-0.337,14.048-3.999l42.422-42.422l87.518,87.503c5.86,5.86,15.351,5.86,21.211,0l63.633-63.633   C513.465,438.113,513.465,428.621,507.605,422.762z"/>
	<path d="M135,0h-30c-8.291,0-15,6.709-15,15s6.709,15,15,15h30c8.291,0,15-6.709,15-15S143.291,0,135,0z"/>
	<path d="M195,30h30c8.291,0,15-6.709,15-15s-6.709-15-15-15h-30c-8.291,0-15,6.709-15,15S186.709,30,195,30z"/>
	<path d="M285,30h30c8.291,0,15-6.709,15-15s-6.709-15-15-15h-30c-8.291,0-15,6.709-15,15S276.709,30,285,30z"/>
	<path d="M135,390h-30c-8.291,0-15,6.709-15,15s6.709,15,15,15h30c8.291,0,15-6.709,15-15S143.291,390,135,390z"/>
	<path d="M375,30h15v15c0,8.291,6.709,15,15,15s15-6.709,15-15V15c0-8.291-6.709-15-15-15h-30c-8.291,0-15,6.709-15,15   S366.709,30,375,30z"/>
	<path d="M45,0H15C6.709,0,0,6.709,0,15v30c0,8.291,6.709,15,15,15s15-6.709,15-15V30h15c8.291,0,15-6.709,15-15S53.291,0,45,0z"/>
	<path d="M15,150c8.291,0,15-6.709,15-15v-30c0-8.291-6.709-15-15-15S0,96.709,0,105v30C0,143.291,6.709,150,15,150z"/>
	<path d="M15,240c8.291,0,15-6.709,15-15v-30c0-8.291-6.709-15-15-15s-15,6.709-15,15v30C0,233.291,6.709,240,15,240z"/>
	<path d="M15,330c8.291,0,15-6.709,15-15v-30c0-8.291-6.709-15-15-15s-15,6.709-15,15v30C0,323.291,6.709,330,15,330z"/>
	<path d="M420,105c0-8.291-6.709-15-15-15s-15,6.709-15,15v30c0,8.291,6.709,15,15,15s15-6.709,15-15V105z"/>
	<path d="M405,180c-8.291,0-15,6.709-15,15v19.146l30,9.999V195C420,186.709,413.291,180,405,180z"/>
	<path d="M45,390H30v-15c0-8.291-6.709-15-15-15s-15,6.709-15,15v30c0,8.291,6.709,15,15,15h30c8.291,0,15-6.709,15-15   S53.291,390,45,390z"/>
	<path d="M195,390c-8.291,0-15,6.709-15,15s6.709,15,15,15h29.152l-10.001-30H195z"/>
</g>















</svg>`
};

