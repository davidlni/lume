# material-texture

<div id="example"></div>
<script type="application/javascript">
  new Vue({
    el: '#example',
    template: '<live-code class="full" :template="code" mode="html>iframe" :debounce="200" />',
    data: {
      code:
`
<script src="${location.origin+location.pathname}/global.js"><\/script>

<style>
    body, html {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #191919;
    }
</style>

<!-- use the disable-css attribute so that we have only WebGL rendering enabled -->
<i-scene id="scene" experimental-webgl disable-css="false">
    <i-ambient-light intensity="0.3"></i-ambient-light>
    <i-point-light
        id="light"
        color="white"
        position="300 300 300"
        size="0 0 0"
        cast-shadow="true"
        intensity="0.8"
        >
    </i-point-light>
    <i-box id="model"
        rotation="40 40 0"
        align="0.5 0.5 0.5"
        mount-point="0.5 0.5 0.5"
        size="100 100 100"
        color="white" COMMENT-otherwise-the-material-will-be-tinted-random-color
        texture="${location.origin+location.pathname}/textures/cement.jpg"
    >
    </i-box>
</i-scene>

<script>
    // defines the default names for the HTML elements
    LUME.useDefaultNames()

    const light = document.querySelector('#light')

    document.addEventListener('pointermove', function(e) {
        e.preventDefault()
        light.position.x = e.clientX
        light.position.y = e.clientY
    })

    const el = document.querySelector('#model')
    const Motor = LUME.Motor

    const rotate = (t) => 180 * Math.sin(0.0005 * t)
    el.rotation = (x, y, z, t) => [rotate(t/1.4), rotate(t/2.1), rotate(t/2.5)]
<\/script>

`
    },
  })
</script>
