import React from 'react'
import ReactCSS, {Component} from 'reactcss'
import shallowCompare from 'react-addons-shallow-compare'

import { CustomPicker } from 'react-color';
import { Hue, Alpha, Saturation } from 'react-color/lib/components/common'
import SketchFields from './sketch-fields.react'
import SketchPresetColors from './sketch-preset-colors.react'


class SketchPicker extends React.Component {
    constructor (props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
    }


  shouldComponentUpdate () {
      return shallowCompare.bind(this, this, arguments[0], arguments[1]);
  }

  handleChange (data) {
    this.props.onChange(data)
  }

  render() {
    return (
      <div className="picker">
        <div className="saturation">
          <Saturation className="saturation2" {...this.props} onChange={ this.handleChange }/>
        </div>
        <div className="controls" className="flexbox-fix">
          <div className="sliders">
            <div className="hue">
              <Hue className="hue2" {...this.props} onChange={ this.handleChange } />
            </div>
            <div className="alpha">
              <Alpha className="alpha2" {...this.props} onChange={ this.handleChange } />
            </div>
          </div>
          <div className="color">
            <div className="activeColor" style={{ backgroundColor: 'rgba(' + this.props.rgb.r + ', ' + this.props.rgb.g + ', ' + this.props.rgb.b + ', ' + this.props.rgb.a + ')' }}/>
          </div>
        </div>
        <div className="fields">
          <SketchFields {...this.props} onChange={ this.handleChange } disableAlpha={ this.props.disableAlpha } />
        </div>

      </div>
    )
  }
}

SketchPicker.defaultProps = {
  presetColors: ['#D0021B', '#F5A623', '#F8E71C', '#8B572A', '#7ED321', '#417505', '#BD10E0', '#9013FE', '#4A90E2', '#50E3C2', '#B8E986', '#000000', '#4A4A4A', '#9B9B9B', '#FFFFFF'],
  width: 200,
}

export default CustomPicker(SketchPicker)

/*
<div className="presets">
  <SketchPresetColors colors={ this.props.presetColors } onClick={ this.handleChange } />
</div>
*/
