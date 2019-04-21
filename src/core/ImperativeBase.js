import {Class, Mixin, instanceOf} from 'lowclass'
import {Object3D} from 'three'
import Transformable from './Transformable'
import ElementOperations from './ElementOperations'
import Node from './Node'
import Scene from './Scene'
import Motor from './Motor'
import {CSS3DObjectNested} from '../lib/three/CSS3DRendererNested'
import {disposeObject} from '../utils/three'
import {Events} from './Events'

window.addEventListener('error', (event) => {
    const error = event.error
    if (/Illegal constructor/i.test(error.message)) {
        console.error(`
            One of the reasons the following error can happen is if a Custom
            Element is called with 'new' before being defined.
            For other reasons, see: https://www.google.com/search?q=chrome%20illegal%20constructor
        `)
    }
})

let three = null
let domPlane = null

// We explicitly use `var` instead of `let` here because it is hoisted for the
// Node and Scene modules. This, along with the following initImperativeBase
// function, allows the circular dependency between this module and the Node and
// Scene modules to work. For details on why, see
// https://esdiscuss.org/topic/how-to-solve-this-basic-es6-module-circular-dependency-problem.
var ImperativeBase

// A "gateway" pattern is in play here, so that the Scene module is the only
// module that can get access to the ImperativeBaseProtected helper.
// https://esdiscuss.org/topic/share-a-secret-across-es6-specific-modules-so-that-other-modules-cannot-access-the-secret
var ImperativeBaseProtected
var ImperativeBaseProtectedImportCount
var maxImportCount
export function getImperativeBaseProtectedHelper() {
    maxImportCount = maxImportCount || 2

    // note, ImperativeBaseProtectedImportCount can be initially undefined,
    // because it is hoisted above all modules
    ImperativeBaseProtectedImportCount = (ImperativeBaseProtectedImportCount || 0) + 1

    if (ImperativeBaseProtectedImportCount > maxImportCount) {
        throw new Error('You are not allowed to import ImperativeBaseProtected')
    }

    return () => ImperativeBaseProtected
}

// Here we wrap the definition of the ImperativeBase class with this function in
// order to solve the circular depdendency problem caused by the
// Node<->ImperativeBase and Scene<->ImperativeBase circles. The Node and Scene
// modules call initImperativeBase to ensure that the ImperativeBase declaration
// happens first, and then those modules can use the live binding in their
// declarations.
initImperativeBase()
export function initImperativeBase() {
    if (ImperativeBase) return

    const ImperativeBaseBrand = {brand: 'ImperativeBase'}

    /**
     * The ImperativeBase class is the base class for the Imperative version of the
     * API, for people who chose to take the all-JavaScript approach and who will
     * not use the HTML-based API (infamous/motor-html).
     *
     * In the future when there is an option to disable the HTML-DOM rendering (and
     * render only WebGL, for example) then the imperative API will be the only API
     * available since the HTML API will be turned off as a result of disabling
     * HTML rendering. Disabling both WebGL and HTML won't make sense, as we'll need
     * at least one of those to render with.
     */
    ImperativeBase = Mixin(Base =>

        Class('ImperativeBase').extends( Transformable.mixin( Base ), ({ Super, Public, Private, Protected }) => {

            // we leak the protected helper so that the Scene class can access
            // the protected members of all nodes in the tree, otherwise the
            // Scene's Protected helper does not allow access to sibling class
            // instance protected members. This is the same limitation as the
            // one designed in TypeScript or C#. See
            // https://github.com/Microsoft/TypeScript/issues/30756
            ImperativeBaseProtected = Protected

            return {

                constructor(options = {}) {
                    if (ImperativeBaseProtectedImportCount > maxImportCount) {
                        throw new Error('You are not allowed to import ImperativeBaseProtected')
                    }

                    const self = Super(this).constructor(options)

                    // we don't need this, keep for backward compatibility (mainly
                    // all my demos at trusktr.io).
                    self.imperativeCounterpart = self

                    // Here we create the DOM HTMLElement associated with this
                    // Imperative-API Node.
                    Protected(self)._elementOperations = new ElementOperations(self)

                    // See Transformable/Sizeable propertychange event.
                    // TODO: defer size calculation to render task
                    self.on('propertychange', Private(self).__onPropertyChange, Private(self))

                    return self
                },

                get glLoaded() {
                    return Protected(this)._glLoaded
                },

                get cssLoaded() {
                    return Protected(this)._cssLoaded
                },

                get three() {
                    // if (!(this.scene && this.scene.experimentalWebgl)) return null

                    if (!Private(this).__three) {
                        const three = Private(this).__three = Protected(this)._makeThreeObject3d()
                        three.pivot = new THREE.Vector3
                    }

                    return Private(this).__three
                },

                get threeCSS() {
                    // if (!(this.scene && !this.scene.disableCss)) return null

                    if (!Private(this).__threeCSS) {
                        const threeCSS = Private(this).__threeCSS = Protected(this)._makeThreeCSSObject()
                        threeCSS.pivot = new THREE.Vector3
                    }

                    return Private(this).__threeCSS
                },

                childConnectedCallback(child) {
                    Super(this).childConnectedCallback(child)

                    // children can be non-lib DOM nodes (f.e. div, h1, etc)
                    if (instanceOf(child, Node)) {
                        Protected(child)._triggerLoadGL()
                        Protected(child)._triggerLoadCSS()
                    }
                },

                childDisconnectedCallback(child) {
                    Super(this).childDisconnectedCallback(child)

                    // children can be non-lib DOM nodes (f.e. div, h1, etc)
                    if (instanceOf(child, Node)) {
                        Protected(child)._triggerUnloadGL()
                        Protected(child)._triggerUnloadCSS()
                    }
                },

                /**
                 * Get the Scene that this Node is in, null if no Scene. This traverses up recursively
                 * at first, then the value is cached.
                 *
                 * @readonly
                 */
                get scene() {
                    // NOTE: this._scene is initally null.

                    const parent = this.parent

                    // if already cached, return it. Or if no parent, return it (it'll be null).
                    // Additionally, Scenes have this._scene already set to themselves.
                    if (Protected(this)._scene || !parent) return Protected(this)._scene

                    // if the parent node already has a ref to the scene, use that.
                    if (Protected(parent)._scene) {
                        Protected(this)._scene = Protected(parent)._scene
                    }
                    else if (parent instanceof Scene) {
                        Protected(this)._scene = parent
                    }
                    // otherwise call the scene getter on the parent, which triggers
                    // traversal up the scene graph in order to find the root scene (null
                    // if none).
                    else {
                        Protected(this)._scene = parent.scene
                    }

                    return Protected(this)._scene
                },

                /**
                 * @override
                 */
                add(childNode) {
                    if (!instanceOf(childNode, ImperativeBase)) return

                    // We cannot add Scenes to Nodes, for now.
                    if (childNode instanceof Scene) {
                        throw new Error(`
                            A Scene cannot be added to another Node or Scene (at
                            least for now). To place a Scene in a Node, just mount
                            a new Scene onto a MotorHTMLNode with Scene.mount().
                        `)
                    }

                    Super(this).add(childNode)

                    // Calculate sizing because proportional size might depend on
                    // the new parent.
                    Protected(childNode)._calcSize()
                    childNode.needsUpdate()

                    // child should watch the parent for size changes.
                    this.on('sizechange', Protected(childNode)._onParentSizeChange, Protected(childNode))

                    Protected(this)._elementOperations.connectChildElement(childNode)

                    return this
                },

                remove(childNode, /* private */__leaveInDom) {
                    if (!(childNode instanceof Node)) return

                    Super(this).remove(childNode)

                    this.off('sizechange', Protected(childNode)._onParentSizeChange, Protected(childNode))

                    if (!__leaveInDom)
                        Protected(this)._elementOperations.disconnectChildElement(childNode)
                },

                needsUpdate() {
                    // we don't need to render until we're connected into a tree with a scene.
                    if (!this.scene || !this.isConnected) return
                    // TODO make sure we render when connected into a tree with a scene

                    Protected(this)._willBeRendered = true
                    Motor.setNodeToBeRendered(this)
                },

                protected: {
                    _glLoaded: false,
                    _cssLoaded: false,
                    _willBeRendered: false,
                    _elementOperations: null, // ElementOperations

                    // stores a ref to this Node's root Scene when/if this Node is
                    // in a scene.
                    _scene: null, // Scene | null

                    _makeThreeObject3d() {
                        return new Object3D
                    },

                    _makeThreeCSSObject() {
                        return new CSS3DObjectNested(Public(this))
                    },

                    _loadGL() {
                        if (!(Public(this).scene && Public(this).scene.experimentalWebgl)) return

                        if (this._glLoaded) return
                        this._glLoaded = true

                        // we don't let Three update local matrices automatically, we do
                        // it ourselves in Transformable._calculateMatrix and
                        // Transformable._calculateWorldMatricesInSubtree
                        Public(this).three.matrixAutoUpdate = false

                        // NOTE, Public(this).parent works here because _loadGL is called by
                        // childConnectedCallback at which point a child is already
                        // upgraded and thus has Public(this).parent API ready.
                        Public(this).parent && Public(this).parent.three.add(Public(this).three)

                        // If a subclass needs to initialize values in its Three.js
                        // object, it will have the passInitialValuesToThree method for
                        // that.
                        //
                        // TODO we shouldn't need to define passInitialValuesToThree in
                        // sub classes, the default values of the props should
                        // automatically be in place.
                        Public(this).passInitialValuesToThree && Public(this).passInitialValuesToThree()

                        Public(this).needsUpdate()
                    },

                    _unloadGL() {
                        if (!this._glLoaded) return
                        this._glLoaded = false

                        disposeObject(Private(this).__three)
                        Private(this).__three = null

                        Public(this).needsUpdate()
                    },

                    _loadCSS() {
                        if (!(Public(this).scene && !Public(this).scene.disableCss)) return

                        if (this._cssLoaded) return
                        this._cssLoaded = true

                        // we don't let Three update local matrices automatically, we do
                        // it ourselves in Transformable._calculateMatrix and
                        // Transformable._calculateWorldMatricesInSubtree
                        Public(this).threeCSS.matrixAutoUpdate = false

                        // NOTE, Public(this).parent works here because _loadCSS is called by
                        // childConnectedCallback at which point a child is already
                        // upgraded and thus has Public(this).parent API ready.
                        Public(this).parent && Public(this).parent.threeCSS.add(Public(this).threeCSS)

                        Public(this).needsUpdate()
                    },

                    _unloadCSS() {
                        if (!this._cssLoaded) return
                        this._cssLoaded = false

                        disposeObject(Private(this).__threeCSS)
                        Private(this).__threeCSS = null

                        Public(this).needsUpdate()
                    },

                    _triggerLoadGL() {
                        this._loadGL()
                        Public(this).emit(Events.BEHAVIOR_GL_LOAD, Public(this))
                        Promise.resolve().then(() => {
                            Public(this).emit(Events.GL_LOAD, Public(this))
                        })
                    },

                    _triggerUnloadGL() {
                        this._unloadGL()
                        Public(this).emit(Events.BEHAVIOR_GL_UNLOAD, Public(this))
                        Promise.resolve().then(() => {
                            Public(this).emit(Events.GL_UNLOAD, Public(this))
                        })
                    },

                    _triggerLoadCSS() {
                        this._loadCSS()
                        Public(this).emit(Events.CSS_LOAD, Public(this))
                    },

                    _triggerUnloadCSS() {
                        this._unloadCSS()
                        Public(this).emit(Events.CSS_UNLOAD, Public(this))
                    },

                    _render(timestamp) {
                        if ( Super(this)._render ) Super(this)._render()

                        this._elementOperations.applyImperativeNodeProperties(Public(this))
                    },

                    // This method is used by Motor._renderNodes().
                    _getNearestAncestorThatShouldBeRendered() {
                        let parent = Public(this).parent

                        while (parent) {
                            if (parent._willBeRendered) return parent
                            parent = parent.parent
                        }

                        return false
                    },
                },

                private: {
                    __three: null,
                    __threeCSS: null,

                    __onPropertyChange(prop) {
                        if ( prop == 'sizeMode' || prop == 'size' ) {
                            Protected(this)._calcSize()
                        }

                        Public(this).needsUpdate()
                    },
                },

            }
        }, ImperativeBaseBrand)

    )

}

export {ImperativeBase as default}
