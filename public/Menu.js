class Menu {
	constructor() {
		this.elem = document.getElementById('menu');
		this.elem.onmousedown = function() {event.stopPropagation();}
		this.x = 0;
		this.y = 0;
		this.elem.innerHTML = `
			<div id="filebar_cmds">
			<div class="cmd" onclick="File.newUntitled();menu.close();">`+svg.add+`New</div>
			<div class="cmd" onclick="Panel.selectAll(menu.target)">`+svg.select+`Select All</div>
			<div class="cmd" onclick="Panel.closeAll(menu.target)">`+svg.close+`Close All</div>
			</div>
			<div id="file_cmds">
			<div id="creation_cmds">
			<div class="cmd" onclick="menu.askNew();">`+svg.add+`New</div>
			<label for="upload" class="cmd">`+svg.upload+`Upload</label>
			</div>
			<div id="operation_cmds">
			<div id="cmd_viewin" class="cmd" onclick="File.viewFolder(tree.selected);">`+svg.folder+`View in Folder</div>
			<div id="cmd_rename" class="cmd" onclick="menu.askRename();">`+svg.pencil+`Rename</div>
			<div class="cmd" onclick="File.delete(tree.selected);">`+svg.trash+`Delete</div>
			<div id="cmd_view" class="cmd" onclick="File.view(tree.selected);">`+svg.link+`View</div>
			<div class="cmd" onclick="File.requestDownload(tree.selected);">`+svg.download+`Download</div>
			<div id="cmd_compress" class="cmd" onclick="File.compress(tree.selected);">`+svg.compress+`Compress</div>
			<div id="cmd_extract" class="cmd" onclick="File.extract(tree.selected)">`+svg.extract+`Extract</div>
			<div id="cmd_code" class="cmd" onclick="File.editCode(tree.selected);">`+svg.code+`Edit Code</div>
			<div class="cmd" onclick="File.getInfo(tree.selected[0]);">`+svg.info+`Info</div>
			</div>
			</div>
		`;
	}
	open(target) {
		var x = mx, y = my;
		this.elem.style.display = 'block';
		this.target = target;
		if(target.classList.contains('filebarWrap')) {
			document.getElementById('file_cmds').style.display = 'none';
			document.getElementById('filebar_cmds').style.display = 'block';
		}
		else {
			document.getElementById('file_cmds').style.display = 'block';
			document.getElementById('filebar_cmds').style.display = 'none';
			if(!target.parentNode.classList.contains('file') && !target.classList.contains('tab') || target.dataset.isUndefined === 'true') {
				this.elem.querySelector('#operation_cmds').style.display = 'none';
				tree.toggleSelect(tree.selected);
			}
			else {this.elem.querySelector('#operation_cmds').style.display = 'block';}
			if(tree.selected.length === 1) {this.elem.querySelector("#cmd_rename").style.display = 'block';}
			else {this.elem.querySelector("#cmd_rename").style.display = 'none';}
			if(tree.selected.every(function(path) {return path.match(/.zip/);})) {this.elem.querySelector("#cmd_extract").style.display = 'block';this.elem.querySelector("#cmd_compress").style.display = 'none';this.elem.querySelector("#cmd_view").style.display = 'none';}
			else {this.elem.querySelector("#cmd_extract").style.display = 'none';this.elem.querySelector("#cmd_compress").style.display = 'block';this.elem.querySelector("#cmd_view").style.display = 'block';}
			if(tree.selected.every(function(path) {return '.'+path.split('.').pop().toLowerCase() in mediaTypes;})) {this.elem.querySelector("#cmd_code").style.display = 'block';}
			else {this.elem.querySelector("#cmd_code").style.display = 'none';}
			if(document.getElementById('tree').style.display === 'none') {
				this.elem.querySelector('#creation_cmds').style.display = 'none';
				this.elem.querySelector('#operation_cmds').style.borderTop = '0';
				if(tree.selected.length === 1) {this.elem.querySelector('#cmd_viewin').style.display = 'block';}
				else {this.elem.querySelector('#cmd_viewin').style.display = 'none';}
			}
			else {
				this.elem.querySelector('#operation_cmds').style.borderTop = '1px solid var(--highlight)';
				this.elem.querySelector('#creation_cmds').style.display = 'block';
				this.elem.querySelector('#cmd_viewin').style.display = 'none';
			}
		}
		if(x < 5) {x = 5;}
		else if(x+5+this.elem.offsetWidth > document.body.offsetWidth) {x = document.body.offsetWidth - this.elem.offsetWidth - 5;}
		if(y < 5) {y = 5;}
		else if(y+5+this.elem.offsetHeight > document.body.offsetHeight) {y = document.body.offsetHeight - this.elem.offsetHeight - 5;}
		this.x = x;this.y = y;
		this.elem.style.top = y + 'px';
		this.elem.style.left = x + 'px';

	}
	close(deselect) {
		var self = this;
		this.target = null;
		this.elem.style.display = 'none';
		if(deselect) {tree.toggleSelect(tree.selected);}
	}
	askNew() {
			popup('new', '<input placeholder="Filenames" oninput="filter(this,\'file\');" onkeydown="if(event.keyCode == 13){File.create(tree.selected,[this]);}" spellcheck="false" />', ['create'], [File.create]);
	}
	askRename() {
		if(tree.selected.length === 1) {
			var name = tree.selected[0].split('/').pop();
			popup('rename', '<input placeholder="/" value="'+name+'" oninput="filter(this,\'file\');" onblur="filter(this, \'required\');" onkeydown="if(event.keyCode == 13){File.rename(tree.selected,[this]);}" onfocus="var i = this.value.indexOf(\'.\') || this.value.length;this.setSelectionRange(0,i);" spellcheck="false" />', ['rename'], [File.rename]);
		}
	}
}