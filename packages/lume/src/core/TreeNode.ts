import {Mixin, MixinResult, Constructor} from 'lowclass'
import WithUpdate from '../html/WithUpdate'

/**
 * @class TreeNode - The `TreeNode` class represents objects that are connected
 * to each other in parent-child relationships in a tree structure. A parent
 * can have multiple children, and a child can have only one parent. Inherits from [WithUpdate](../html/WithUpdate)
 * @extends WithUpdate
 */
export const TreeNode = Mixin(TreeNodeMixin)
export interface TreeNode extends InstanceType<typeof TreeNode> {}
export default TreeNode

export function TreeNodeMixin<T extends Constructor>(Base: T) {
	// TODO WithUpdate.mixin isn't enforcing that we pass Constructor
	// constrained to extend from HTMLElement
	class TreeNode extends WithUpdate.mixin(Constructor<HTMLElement>(Base)) {
		private __parent: TreeNode | null = null
		private __children: TreeNode[] = []

		/**
		 * @property {TreeNode} parent - The parent of the current TreeNode.
		 * Each node in a tree can have only one parent.
		 * @readonly
		 */
		get parent() {
			return this.__parent
		}

		/**
		 * @property {TreeNode[]} subnodes - An array of this TreeNode's
		 * children. This returns a clone of the internal child array, so
		 * modifying the cloned array directly does not effect the state of the
		 * TreeNode. Use [TreeNode.add(child)](#addchild) and
		 * [TreeNode.removeNode(child)](#removenode) to modify a TreeNode's
		 * list of children.
		 * This is named `subnodes` to avoid conflict with HTML's Element.children property.
		 * @readonly
		 */
		get subnodes() {
			// return a new array, so that the user modifying it doesn't affect
			// this node's actual children.
			return [...this.__children]
		}

		/**
		 * @method add - Add a child node to this TreeNode.
		 * @param {TreeNode} childNode - The child node to add.
		 * @returns {this}
		 */
		add(childNode: TreeNode): this {
			if (!(childNode instanceof TreeNode))
				throw new TypeError('TreeNode.add() expects the childNode argument to be a TreeNode instance.')

			if (childNode.__parent === this) throw new ReferenceError('childNode is already a child of this parent.')

			if (childNode.__parent) childNode.__parent.removeNode(childNode)

			childNode.__parent = this

			this.__children.push(childNode)

			Promise.resolve().then(() => {
				childNode.connected()
				this.childConnected(childNode)
			})

			return this
		}

		/**
		 * Add all the child nodes in the given array to this node.
		 *
		 * @param {Array.TreeNode} nodes The nodes to add.
		 */
		addChildren(nodes: TreeNode[]) {
			nodes.forEach(node => this.add(node))
			return this
		}

		/**
		 * @method removeNode - Remove a child node from this node.
		 * @param {TreeNode} childNode - The node to remove.
		 * @returns {this}
		 */
		removeNode(childNode: TreeNode): this {
			if (!(childNode instanceof TreeNode)) {
				throw new Error(`
                    TreeNode.remove expects the childNode argument to be an
                    instance of TreeNode. There should only be TreeNodes in the
                    tree.
                `)
			}

			if (childNode.__parent !== this) throw new ReferenceError('childNode is not a child of this parent.')

			childNode.__parent = null
			this.__children.splice(this.__children.indexOf(childNode), 1)

			Promise.resolve().then(() => {
				childNode.disconnected()
				this.childDisconnected(childNode)
			})

			return this
		}

		/**
		 * Remove all the child nodes in the given array from this node.
		 *
		 * @param {Array.TreeNode} nodes The nodes to remove.
		 */
		removeChildren(nodes: TreeNode[]) {
			for (let i = nodes.length - 1; i >= 0; i -= 1) {
				this.removeNode(nodes[i])
			}
			return this
		}

		/**
		 * Shortcut to remove all children.
		 */
		removeAllChildren() {
			if (!this.__children.length) throw new ReferenceError('This node has no children.')
			this.removeChildren(this.__children)
			return this
		}

		/**
		 * How many children this TreeNode has.
		 * @readonly
		 */
		get childCount() {
			return this.__children.length
		}

		// generic life cycle methods
		connected() {}
		disconnected() {}
		childConnected(_child: TreeNode) {}
		childDisconnected(_child: TreeNode) {}

		// traverse the tree at this node
		traverse(fn: (n: TreeNode) => void) {
			fn(this)

			const children = this.__children
			for (let i = 0, l = children.length; i < l; i++) {
				children[i].traverse(fn)
			}
		}
	}

	return TreeNode as MixinResult<typeof TreeNode, T>
}

// const t: TreeNode = new TreeNode()
// t.asdfasdf
// t.asdfasdfadfasdf()
// t.childCount
// t.removeNode()
// t.removeNode(new TreeNode())
// t.innerHTML = 123
// t.innerHTML = 'asdf'
// t.setAttribute('foo', 123)
// t.setAttribute('foo', 'bar')
