class Cursor {
	constructor(position,color) {
		this.position = position;
		this.color = color;
		this.cursor = document.createElement('div');
		this.cursor.style.background = color;
		this.cursor.style.zIndex = '5';
		this.cursor.style.position = 'absolute';
		this.cursor.style.width = '2px';asdf
		this.cursor.style.animation = 'slice_cursor_blink 1s Infinite cubic-bezier(0, 1, 1, 1.01)';
	}
	update(trash,markerLayer,session,layerConfig) {
		var pos = session.documentToScreenPosition(this.position.row,this.position.column);
		this.cursor.style.top = markerLayer.$getTop(pos.row, layerConfig) + "px";
		this.cursor.style.left = markerLayer.$padding + pos.column * layerConfig.characterWidth + "px";
		this.cursor.style.height = layerConfig.lineHeight + "px";
		this.cursor.remove();
    markerLayer.elt("slice_cursor", "");
    const parentNode = markerLayer.element.childNodes[markerLayer.i - 1] || markerLayer.element.lastChild;
    parentNode.appendChild(this.cursor);
	}
	remove(session) {
		this.cursor.remove();
		session.removeMarker(this.id);
	}
}