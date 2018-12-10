export DeclarativeBase from './DeclarativeBase'
export HTMLNode from './HTMLNode'
export HTMLScene from './HTMLScene'
export WebComponent from './WebComponent'
// export HTMLPushPaneLayout from './HTMLPushPaneLayout'
// export PushPaneLayout from '../components/PushPaneLayout'

export * as behaviors from './behaviors'

import Scene from '../core/Scene'
import Node from '../core/Node'
import Mesh from '../core/Mesh'
import Box from '../core/Box'
import Sphere from '../core/Sphere'
import Plane from '../core/Plane'
import PointLight from '../core/PointLight'
import DOMNode from '../core/DOMNode'
import DOMPlane from '../core/DOMPlane'
import AmbientLight from '../core/AmbientLight'
import Camera from '../core/Camera'
import AutoLayoutNode from '../layout/AutoLayoutNode'

export function useDefaultNames() {

    const classes = [
        Scene,
        Node,
        Mesh,
        Box,
        Sphere,
        Plane,
        PointLight,
        DOMNode,
        DOMPlane,
        AmbientLight,
        Camera,
        AutoLayoutNode,
        // PushPaneLayout,
    ]

    for (const constructor of classes) {
        if (!customElements.get(constructor.defaultElementName))
            constructor.define()
    }

}
