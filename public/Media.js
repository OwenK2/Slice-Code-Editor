class Media {
	constructor(file) {
		var self = this;
		this.ext = file.extname;
		this.type = mediaTypes[file.extname.toLowerCase()];
		this.wrap = document.createElement('div');
		this.wrap.className = 'wrap';
		this.elem = this.container = document.createElement('div');
		this.elem.className = 'editor media';
		this.userElem = document.createElement('div');
		this.userElem.className = 'onlineUsers';
		this.media = document.createElement(this.type);
		this.media.className = 'mediaElem';
		var link = window.location.href.split('/');
		this.url = link[0] + '//' + link[2] + file.rel;
		if(this.type === 'img') {
			this.media.src = this.url;
			this.elem.className += " img";
			this.media.onload = function() {
				self.scale = 1;
				self.h = this.offsetHeight;
				self.w = this.offsetWidth;
			}
			this.elem.addEventListener('mousewheel', function(e) {self.onScroll(e)});
		}
		else if(this.type === 'video' || this.type === 'audio') {
			this.media.controls = true;
			this.media.innerHTML = '<source src="'+this.url+'" />';
		}
		else if(this.type === 'embed') {
			this.media.src = this.url;
			this.media.type = 'application/pdf';
		}
		else if(this.type === 'div') {
			this.fontLink = document.createElement("style");
			this.fontLink.innerHTML = "@font-face {font-family: "+file.name+";src: url("+this.url+");}";
			this.media.style.fontFamily = file.name;
			this.media.innerHTML = file.name+'<br><br>AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz<br>1234567890<br>~!@#$%^&*()_+{}|:";\'<\\>?,./';
			this.media.setAttribute('contenteditable', true);
			this.media.spellcheck = false;
			this.fontSize = 10;
			this.scale = 1;
			this.elem.addEventListener('mousewheel', function(e) {self.onScroll(e)});
		}
		this.elem.appendChild(this.media);
		if(this.fontLink) {this.elem.appendChild(this.fontLink);}
		this.elem.appendChild(this.userElem);
		this.wrap.appendChild(this.elem);
		file.panel.editorElem.appendChild(this.wrap);
	}
	onScroll(e) {
		if(!this.scale) {return;}
		var delta = Math.abs(event.wheelDelta)/event.wheelDelta*this.scale/20;
		if(this.scale < .1) {this.scale = .1;}
		if(delta > 0 && (this.w*this.scale > this.elem.offsetWidth || this.h*this.scale > this.elem.offsetHeight)) {return;}
		this.scale += delta;
		if(this.type === 'img') {
			this.media.style.width = this.w * this.scale + "px";
			this.media.style.height = this.h * this.scale + "px";
		}
		else {
			this.media.style.fontSize = this.fontSize * this.scale + "pt";
		}
	}
	focus() {
		this.media.focus();
	}
	destroy() {
		if(this.fontLink) {this.fontLink.remove();}
		this.elem.remove();
	}
}

var mediaTypes = {
	'.png': 'img',
	'.svg': 'img',
	'.gif': 'img',
	'.jpeg': 'img',
	'.jpg': 'img',
	'.ico': 'img',
	'.ai': 'img',
	'.psd': 'img',
	'.tif': 'img',
	'.tiff': 'img',
	'.jfif': 'img',
	'.mov': 'video',
	'.mp4': 'video',
	'.wmv': 'video',
	'.avi': 'video',
	'.webm': 'video',
	'.mp3': 'audio',
	'.oog': 'audio',
	'.wav': 'audio',
	'.ttf': 'div',
	'.otf': 'div',
	'.fnt': 'div',
	'.fon': 'div',
	'.pdf': 'embed'
};