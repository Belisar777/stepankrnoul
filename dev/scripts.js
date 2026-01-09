Sec = {

	addListeners: function (type, elements, listener) {
		for (let index = 0; index < elements.length; index++) {
			const el = elements[index];
			el.addEventListener(type, listener);
		}
	},

	openPreview: function () {
		document.getElementById("modalImage").src = this.src;
		Sec.modal.style.display = "block";
		document.getElementById("caption").innerHTML = this.alt;
	},

	closePreview: function () {
		Sec.modal.style.display = "none";
	},

	openMenu: function () {
		document.getElementById("mySidebar").style.display = "block";
		document.getElementById("myOverlay").style.display = "block";
	},

	closeMenu: function () {
		document.getElementById("mySidebar").style.display = "none";
		document.getElementById("myOverlay").style.display = "none";
	}
};

document.addEventListener("DOMContentLoaded", function () {

	Sec.modal = document.getElementById("modal");
	Sec.menuOpeners = document.querySelectorAll(".menuOpener");
	Sec.menuClosers = document.querySelectorAll(".menuCloser");
	Sec.galleryImgs = document.querySelectorAll(".gallery img");

	Sec.addListeners("click", Sec.galleryImgs, Sec.openPreview);
	Sec.addListeners("click", Sec.menuOpeners, Sec.openMenu);
	Sec.addListeners("click", Sec.menuClosers, Sec.closeMenu);

	Sec.modal.addEventListener("click", Sec.closePreview);

});