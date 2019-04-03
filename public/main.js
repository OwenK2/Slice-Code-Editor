var socket, user, tree, modelist, Range, Emmet, menu, firstTime;
var mx, my, sx, sy, down, drag, resizer, fileHold, holdTimer, arrowInterval;
var keys = {}, fileDragOver = 0, savenclose = [], untitledIndex = 0;
var users = {};

window.addEventListener('load', function() {
	socket = io();
	user = new User();
  var r = getCookie('root'), o = getCookie('opened');
  if(o) {o = JSON.parse(o);}
	tree = new Tree(r,o);
  menu = new Menu();
	modelist = ace.require('ace/ext/modelist');
	Range = ace.require('ace/range').Range;
  Emmet = ace.require("ace/ext/emmet");
	p = new Panel();
  var rsz = new Resizer(document.getElementById('sidebar'),'vert',true,250);
  rsz.elem.id = 'mainResizer';
	socket.on('connect', function() {
		user.id = socket.id;
    firstTime = true;
    request('connect', {id:user.id}, function(data) {
      if(data === false) {location.reload();}
      Object.keys(data).forEach(function(key) {
        if(key === 'base') {return;}
        var val = data[key];
        while(typeof val === 'string' && JSON.valid(val)) {val = JSON.parse(val);}
        user[key] = val;
      });
      tree.base = data.base;
      applySettings();
      applyPref();
      updatePref();
      updateSwatches();
      setTheme(user.prefrences.theme);
    });
	});
  socket.on('err', function(msg) {notification(msg);});
  socket.on('change', function(data) {if(user.docs[data.path])user.docs[data.path].applyChange(data.d);});
  socket.on('cursor', function(data) {if(user.docs[data.path]){user.docs[data.path].updateCursor(data);}});
  socket.on('users', function(usrs) {
    users = usrs;
    user.colors = users[user.sqlid].colors;
    user.email = users[user.sqlid].email;
    user.favorites = users[user.sqlid].favorites;
    user.ltime = users[user.sqlid].ltime;
    user.online = users[user.sqlid].online;
    user.prefrences = users[user.sqlid].prefrences;
    user.settings = users[user.sqlid].settings;
    user.username = users[user.sqlid].username;
    if(users[user.sqlid].color) {user.color = users[user.sqlid].color;document.documentElement.style.setProperty('--usercolor', user.color);}
  });
  socket.on('favorites', function(favs) {user.favorites = favs;updateFavorites();})
  socket.on('user_joined', function(data) {user.onJoin(data);});
  socket.on('user_left', function(data) {user.onLeave(data)});
  socket.on('renamed', function(data) {user.renamed(data.oldpath,data.file);})
  socket.on('deleted', function(path) {user.deleted(path);});
  socket.on('saved', function(data) {user.onSave(data);});
  socket.on('dir', function(res) {tree.setFiles(res);});
  socket.on('download', function(data) {File.download(data);});
  socket.on('chat', function(chat) {updateChat(chat);});
  socket.on('reload', function() {location.reload();});
  socket.on('struct', function(struct) {tree.struct = struct;tree.searchable = tree.struct.filter(file => file.path.indexOf(tree.root) > -1);});
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('mousemove', mouseMove);
  window.addEventListener('mousedown', mouseDown);
  window.addEventListener('mouseup', mouseUp);
  window.onbeforeunload = function() {if(!user.saved) {return true;}};
  window.addEventListener('dragover', function(e) {e.preventDefault();onDragover(e);});
  window.addEventListener('drop', function(e) {e.preventDefault();onDrop(e);});
  document.getElementById('colorDrag').addEventListener('move', movePicker)
  var themes = Editor.getThemes();
  themes.forEach(function(theme) {
    document.querySelector('#s_theme + label + items').innerHTML += '<item data-value="'+theme+'">'+theme.replace(/(_|-)/g, ' ')+'</item>';
  });
  colorInitalize();
  resize();
  updatePref();
  applySettings();
  linkFont('p_fontFamily', user.prefrences.fontFamily);
  linkFont('s_uiFont', user.settings.uiFont);
  resize();
  manageDropdowns();
  if(!navigator.platform.match(/macintel/i)) {document.head.innerHTML += '<link rel="stylesheet" href="scrollbar.css" />';}
});
function resize() {
  var height = colorscape.offsetHeight;
  colorscape.height = colorscape.width = height;
  huescale.width = huescale.parentNode.offsetWidth;
  huescale.height = height;
  alphascape.width = huescale.parentNode.offsetWidth;
  alphascape.height = height;
  colorInitalize();
  document.documentElement.scrollTop = 0;
  document.documentElement.scrollLeft = 0;
  if(document.body.offsetWidth < 600 && document.getElementById('sidebar').offsetWidth < document.body.offsetWidth-10) {
    fullScreenToggle(false);
  }
  else {
    document.getElementById('content').style.display = 'flex';
    document.getElementById('sidebar').style.display = 'block';
  }
  if(document.getElementById('sidebar').offsetWidth >= document.body.offsetWidth-10 || document.getElementById('sidebar').offsetWidth < 10) {
    document.getElementById('fullScreenArrow').style.display = 'block';
    if(document.getElementById('sidebar').offsetWidth < 10) {document.getElementById('fullScreenArrow').classList.add('active');}
    else {document.getElementById('fullScreenArrow').classList.remove('active');}
  }
  else {
    document.getElementById('fullScreenArrow').style.display = 'none';
  }
}
function keyDown(e) {
  keys[e.code.replace(/key/gi, '').toLowerCase()] = true;
  if(keys.s && (e.metaKey|| e.ctrlKey) && user.panel.active) {
    e.preventDefault();
    delete keys.s;
    user.docs[user.panel.active].save();
  }
  if(keys.t && e.altKey) {
    e.preventDefault();
    delete keys.t;
    toggleChat();
  }
  if(keys.c && e.altKey) {
    e.preventDefault();
    delete keys.c;
    togglePicker();
  }
  if(keys.n && e.altKey || keys.n && (e.metaKey|| e.ctrlKey)) {
  	e.preventDefault();
  	delete keys.n;
    File.newUntitled();
  }
  if(keys.o && (e.metaKey|| e.ctrlKey)) {
    event.preventDefault();
    delete keys.o;
    document.getElementById('upload').click();
  }
  if(keys.f && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    delete keys.f;
    if(document.activeElement === document.getElementById('fileSearch')) {toggleFind();}
    else {toggleFind(true);}
  }
  if(keys.f && e.altKey) {
    e.preventDefault();
    delete keys.f;
    toggleFavorites();
  }
  if(keys.a && e.altKey) {
    e.preventDefault();
    delete keys.a;
    User.displayInfo(user.sqlid);
  }
  if(keys.escape) {
    e.preventDefault();
    delete keys.escape;
    if(document.getElementById('shade').style.opacity === '1') {
      closePopup();
    }
    else if(document.getElementById('pref').classList.contains('open')) {
      togglePref();
    }
    else if(document.getElementById('fileSearch').classList.contains('open')) {
      toggleFind();
    }
    else {
      toggleFeatures();
    }
  }
  if(keys.h && e.altKey) {
    e.preventDefault();
    delete keys.h;
    prefTab('ptabHlp');
    togglePref(true);
  }
  if(keys.equal && (e.metaKey|| e.ctrlKey)) {
    e.preventDefault();
    delete keys.equal;
    var size = parseFloat(user.prefrences.fontSize) + 1;
    if(size > 60) {size = 60;}
    else if(size < 5) {size = 5;}
    setPref('p_fontSize', size+"px");
  }
  if(keys.minus && (e.metaKey|| e.ctrlKey)) {
    e.preventDefault();
    delete keys.minus;
    var size = parseFloat(user.prefrences.fontSize) - 1;
    if(size > 60) {size = 60;}
    else if(size < 5) {size = 5;}
    setPref('p_fontSize', size+"px");
  }
  if(keys.comma && e.altKey) {
    e.preventDefault();
    delete keys.comma;
    prefTab('ptabSet');
    togglePref(true);
  }
  if(keys.digit0 && (e.metaKey|| e.ctrlKey)) {
    e.preventDefault();
    delete keys.digit0;
    tree.opened = [tree.root];
    tree.openAll();
    setCookie('opened', JSON.stringify(tree.opened));
  }
}
function keyUp(e) {
  delete keys[e.code.replace(/key/gi, '').toLowerCase()];
  if(e.code.match(/(alt|shift|meta|control)(left|right)/gi)) {
    keys = {};
  }
}
function mouseMove(e) {
  mx = e.clientX, my = e.clientY;
  if(down && (mx-sx)*(mx-sx) + (my - sy)*(my - sy) > 5) {
    drag = new CustomEvent('move', {
      detail: {offset: down.offset}
    });
    down.target.dispatchEvent(drag);
  }
  if(dragColor) {
    selectColor(dragColor);
  }
  if(resizer) {
    resizer.moveTo(mx,my);
  }
}
function mouseDown(e) {
  sx = e.clientX, sy = e.clientY;
  var bb = e.target.getBoundingClientRect();
  down = {target: e.target, offset: {x:sx - bb.left,y:sy - bb.top}};
  if(e.which === 3 && isDescendant(e.target,document.getElementById('sidebar'))) {
    menu.open(e.target);
  }
}
function mouseUp(e) {
  if(drag && down) {
    var dropEvent = new CustomEvent('release', {
      detail: drag.detail,
    });
    down.target.dispatchEvent(dropEvent);
  }
  down = false;
  drag = null;
  resizer = null;
  fileHold = false;
  clearTimeout(holdTimer);
  clearInterval(arrowInterval);
  dragColor = null;
}
var overFile,fileOverTimer;
var onDragover = throttle(function(e) {
  fileDrag(e);
}, 50);
function fileDrag(e) {
  var x = e.clientX || mx, y = e.clientY || my;
  var elems = tree.elem.querySelectorAll('.dir');
  var found = false;
  for(var i = 0;i<elems.length;i++) {
    var box = elems[i].getBoundingClientRect();
    if(x > box.x && y > box.y && x < box.right && y < box.bottom) {
      elems[i].classList.add('over');
      found = true;
      setFileTimer(elems[i]);
    }
    else {elems[i].classList.remove('over');if(overFile === elems[i]) {clearTimeout(fileOverTimer);overFile = null;}}
  }
  if(!found) {
    var folder = findFolder(e.target);
    if(folder) {
      var folders = tree.elem.querySelectorAll('.folder');
      for(var i = 0;i<folders.length;i++) {
        folders[i].classList.remove('over');
      }
      var elem = tree.elem.querySelector('[data-path="'+folder+'"]');
      elem.classList.add('over');
      setFileTimer(elem);
    }
  }
}
function setFileTimer(elem) {
  if(overFile !== elem) {
    clearTimeout(fileOverTimer);
    overFile = elem;
    fileOverTimer = setTimeout(function() {
      if(!overFile.classList.contains('open')) {
        tree.toggleFolder(overFile);
      }
    }, 1500);
  }
}
function onDrop(e) {
  var fd = new FormData();
  if(e.dataTransfer.items) {
    for(var i = 0;i<e.dataTransfer.items.length;i++) {
      if(e.dataTransfer.items[i].kind === 'file') {
        fd.append('upload', e.dataTransfer.items[i].getAsFile());
      }
    }
  }
  else {
    for(var i = 0;i<e.dataTransfer.files.length;i++) {
      fd.append('upload', e.dataTransfer.files[i]);
    }
  }
  var dest = findFolder(e.target);
  File.upload(fd, dest);
  clearDragData(e);
  clearFileOver();
}
function clearDragData(e) {
  if(e.dataTransfer.items) {
    e.dataTransfer.items.clear();
  }
  else {
    e.dataTransfer.clearData();
  }
}
function clearFileOver() {
  var elems = document.querySelectorAll('.dir');
  for(var i = 0;i<elems.length;i++) {elems[i].classList.remove('over');}
  clearTimeout(fileOverTimer);
}


//HELPERS
function request(cmd, data, callback, loader) {
  var xhr = new XMLHttpRequest();
  if(loader) {document.getElementById(loader).style.opacity = '1';document.getElementById(loader).style.zIndex = '2';}
  xhr.open('POST', cmd, true);
  xhr.onreadystatechange = function() {
    if(xhr.readyState == 4 && xhr.status == 200) {
    	var res = xhr.responseText;
    	if(JSON.valid(res)) {res = JSON.parse(res);}
      if(callback !== null) {callback(res);}
      if(loader) {document.getElementById(loader).style.opacity = '0';setTimeout(function() {document.getElementById(loader).style.zIndex = '-2';}, 500);}
    }
  };
  if(data instanceof FormData) {
    xhr.send(data);
  }
  else if(data) {
    var d = "";
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    Object.keys(data).forEach(function(key) {
      if(typeof data[key] == 'object') {data[key] = JSON.stringify(data[key]);}
      d += key + '=' + encodeURIComponent(data[key]) + '&';
    });
    d = d.substr(0,d.length-1);
    xhr.send(d);
  }
  else {
    xhr.send();
  }
}
function findFolder(elem) {
  var hasSidebar = false;
  elem = elem;
  while(elem && elem !== document.body) {
    if(elem.classList.contains('dir')) {
      return elem.dataset.path;
    }
    if(elem.classList.contains('folder')) {
      return elem.previousElementSibling.dataset.path;
    }
    if(elem.id === 'sidebar') {hasSidebar = true;}
    elem = elem.parentNode;
  }
  if(hasSidebar) {return tree.root;}
  return false;
}
function highlightFolder(x,y, noHighlight) {
  var elems = document.querySelectorAll('.dir');
  var found = false;
  for(var i = 0;i<elems.length;i++) {
    var box = elems[i].getBoundingClientRect();
    if(x > box.x && y > box.y && x < box.right && y < box.bottom) {
      found = elems[i].dataset.path;
      if(!noHighlight) {setFileTimer(elems[i]);}
    }
    else {elems[i].classList.remove('over');if(overFile === elems[i]) {clearTimeout(fileOverTimer);overFile = null;}}
  }
  if(!found) {
    var list = [], len = -Infinity;
    elems = document.querySelectorAll('.folder');
    for(var i = 0;i<elems.length;i++) {
      var path = elems[i].previousElementSibling.dataset.path;
      var box = elems[i].getBoundingClientRect();
      var n = path.split('/').length;
      if(x > box.x && y > box.y && x < box.right && y < box.bottom && n > len) {
        len = n;
        found = path;
        list.push(path);
      }
    }
  }
  if(!found) {
    var offset = document.getElementById('tree').getBoundingClientRect();
    if(x > offset.x && x < offset.right && y > offset.y && y < offset.bottom) {
      found = tree.root;
    }
  }
  if(found && !noHighlight) {tree.elem.querySelector('[data-path="'+found+'"]').classList.add('over');}
  return found;
}
function findOther(arr, index, callback) {
  if(index < arr.length) {
    callback(arr[index]);
  }
  else if(index - 1 < arr.length && index > 0) {
    callback(arr[index - 1]);
  }
  else {
    callback(null);
  }
}
function throttle(fn, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = (new Date).getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return fn(...args);
  }
}
function isDescendant(child, parent) {
  var node = child.parentNode;
  while (node != null) {
   if(node == parent) {
     return true;
   }
   node = node.parentNode;
  }
  return false;
}
JSON.valid = function(text) {
  try {JSON.parse(text);}
  catch(e) {return false;}
  return true;
}
function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return false;
}