class Editor {
	constructor(panel) {
		this.wrap = document.createElement('div');
		this.wrap.className = 'wrap';
		this.elem = document.createElement('div');
		this.elem.className = 'editor';
		this.userElem = document.createElement('div');
		this.userElem.className = 'onlineUsers';
		this.wrap.appendChild(this.elem);
		panel.editorElem.appendChild(this.wrap);
		var a = ace.edit(this.elem);
		Object.assign(this,a);
		Object.assign(this.__proto__,a.__proto__);
		this.setOptions(user.prefrences);
		var self = this;
		this.on('focus', function() {self.onFocus});
		this.elem.appendChild(this.userElem);
	}
	onFocus() {
		user.panel = this.panel;
	}
	static getThemes() {
		return ["ayu-mirage","ayu-dark","ayu-light","chrome","clouds","crimson_editor","dawn","dreamweaver","eclipse","github","iplastic","solarized_light","textmate","tomorrow","xcode","kuroir","katzenmilch","sqlserver","ambiance","chaos","clouds_midnight","dracula","cobalt","gruvbox","green_on_black","idle_fingers","kr_theme","merbivore","merbivore_soft","mono_industrial","monokai","pastel_on_dark","solarized_dark","terminal","tomorrow_night","tomorrow_night_blue","tomorrow_night_bright","tomorrow_night_eighties","twilight","vibrant_ink"];
	}
}