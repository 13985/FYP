"use strict";
class ControlPanel {
    constructor(selector) {
        this.previousX = 0;
        this.previousY = 0;
        this.outerOffsetX = 0;
        this.outerOffsetY = 0;
        this.isDragging = false;
        this.outerDiv = document.querySelector(selector);
        this.originalParent = this.outerDiv.parentElement;
        this.topDiv = this.outerDiv.querySelector(".control-top");
        this.contentDiv = this.outerDiv.querySelector(".control-content");
        this.closeButton = this.topDiv.querySelector("button[type=button]");
        this.closeButton.addEventListener("click", this.close.bind(this));
        this.topDiv.addEventListener("mousedown", (me) => {
            if (me.button == 0) {
                this.isDragging = true;
                this.previousX = me.clientX;
                this.previousY = me.clientY;
            }
        });
        this.topDiv.addEventListener("mouseup", () => {
            this.isDragging = false;
        });
        this.topDiv.addEventListener("mouseleave", () => {
            this.isDragging = false;
        });
        this.topDiv.addEventListener("mousemove", (me) => {
            if (this.isDragging == false) {
                return;
            }
            me.preventDefault();
            this.outerOffsetX += me.clientX - this.previousX;
            this.outerOffsetY += me.clientY - this.previousY;
            this.previousX = me.clientX;
            this.previousY = me.clientY;
            this.outerDiv.style.top = `${this.outerOffsetY}px`;
            this.outerDiv.style.left = `${this.outerOffsetX}px`;
        });
    }
    setCloseCallback(callback) {
        this.closeButton.addEventListener("click", () => {
            callback();
        });
        return this;
    }
    close() {
        this.isDragging = false;
        this.outerOffsetX = 0;
        this.outerOffsetY = 0;
        this.outerDiv.style.top = "";
        this.outerDiv.style.left = "";
        document.body.removeChild(this.outerDiv);
        this.originalParent.appendChild(this.outerDiv);
        setTimeout(() => {
            this.outerDiv.classList.toggle("control-panel-open");
        }, 1); //no idea why it needs to wait some time
    }
    open() {
        const rect = this.outerDiv.getBoundingClientRect();
        this.outerOffsetX = rect.left + window.scrollX;
        this.outerOffsetY = rect.top + window.scrollY;
        this.outerDiv.style.left = `${this.outerOffsetX}px`;
        this.outerDiv.style.top = `${this.outerOffsetY}px`;
        this.originalParent.removeChild(this.outerDiv);
        document.body.appendChild(this.outerDiv);
        setTimeout(() => {
            this.outerDiv.classList.toggle("control-panel-open");
        }, 1); //no idea why it needs to wait some time
    }
}
