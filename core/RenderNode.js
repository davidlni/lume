/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

/* Modified work copyright © 2015 David Valdman */

define(function(require, exports, module) {
    var SpecManager = require('./SpecManager');
    var EventHandler = require('famous/core/EventHandler');
    var Stream = require('famous/streams/Stream');
    var Spec = require('famous/core/Spec');

    function RenderNode(object) {
        this.stream = null;
        this.child = null;
        this.specs = [];
        this.objects = [];
        this._cachedSize = null;

        this._eventInput = new EventHandler();
        this._eventOutput = new EventHandler();
        EventHandler.setInputHandler(this, this._eventInput);
        EventHandler.setOutputHandler(this, this._eventOutput);

        this._eventInput.on('start', function(parentSpec){
            this._eventOutput.emit('start', parentSpec)
        }.bind(this));

        this._eventInput.on('update', function(parentSpec){
            this._eventOutput.emit('update', parentSpec)
        }.bind(this));

        this._eventInput.on('end', function(parentSpec){
            this._eventOutput.emit('end', parentSpec)
        }.bind(this));

        this._eventInput.on('resize', function(size){
            this._eventOutput.emit('resize', size);
        }.bind(this));

        if (object) this.set(object);
    }

    RenderNode.prototype.add = function add(object) {
        var childNode;
        if (object._isView){
            childNode = object;
        }
        else
            childNode = new RenderNode(object);

        if (this.stream)
            childNode.subscribe(this.stream);
        else childNode.subscribe(this);

//        if (this.sizeStream) childNode.subscribe(this.sizeStream);

        if (!this.child) {
            this.child = childNode;
        }
        else if (this.child instanceof Array){
            this.child.push(childNode);
        }
        else this.child = [this.child, childNode];

        return childNode;
    };

    RenderNode.prototype.set = function set(object) {
        this.stream = Stream.lift(
            function(objectSpec, parentSpec){
                return (parentSpec && objectSpec)
                    ? SpecManager.merge(objectSpec, parentSpec)
                    : parentSpec;
            },
            [object, this._eventOutput]
        );

//        this.sizeStream listens to this.stream? property of object?
//        this.sizeStream = Stream.lift(
//            function(objectSpec, parentSize){
//                return (parentSize && objectSpec)
//                    ? SpecManager.getSize(objectSpec, parentSize)
//                    : parentSize;
//            },
//            [object, this._eventOutput]
//        );

        if (object.commit){
            var spec = new Spec();
            spec.subscribe(this.stream);

            this.stream.on('start', function(spec){
                this.specs.push(spec);
                this.objects.push(object);
            }.bind(this, spec));

            this.stream.on('end', function(spec){
                var index = this.specs.indexOf(spec);
                this.specs.splice(index, 1);
                this.objects.splice(index, 1);
            }.bind(this, spec));

//            this.stream.on('resize', function(size){
//            }.bind(this))
        }
    };

    RenderNode.prototype.getSize = function(){
        return this._cachedSize;
    };

    RenderNode.prototype.commit = function commit(allocator){
        for (var i = 0; i < this.specs.length; i++){
            var spec = this.specs[i].get();
            var object = this.objects[i];
            object.commit(spec, allocator);
        }
        if (this.child) {
            if (this.child instanceof Array){
                for (var i = 0; i < this.child.length; i++)
                    this.child[i].commit(allocator);
            }
            else this.child.commit(allocator);
        }
    };

    module.exports = RenderNode;
});