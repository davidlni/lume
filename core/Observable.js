define(function(require, exports, module) {
    var Stream = require('famous/streams/Stream');
    var dirtyQueue = require('famous/core/dirtyQueue');

    function Observable(value){
        Stream.call(this);
        this.value = value || undefined;
    }

    Observable.prototype = Object.create(Stream.prototype);
    Observable.prototype.constructor = Observable;

    Observable.prototype.get = function(){
        return this.value;
    };

    Observable.prototype.set = function(value){
        if (value == this.value) return;
        this.value = value;
        this.emit('start', value);

        dirtyQueue.push(function(){
            this.emit('end', value);
        }.bind(this));
    };

    module.exports = Observable;
});