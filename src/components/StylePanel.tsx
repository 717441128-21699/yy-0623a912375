import { useState } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { TextBoxStyle } from '../types'
import {
  Settings,
  Type,
  AlignLeft,
  Palette,
  BookMarked,
  Save,
  Check,
  X,
} from 'lucide-react'
import './StylePanel.css'

const fontFamilies = [
  'Microsoft YaHei',
  'SimHei',
  'SimSun',
  'KaiTi',
  'FangSong',
  'Arial',
  'Times New Roman',
  'Georgia',
  'Verdana',
]

export default function StylePanel() {
  const {
    defaultStyle,
    selectedTextBoxId,
    textBoxes,
    updateTextBox,
    setDefaultStyle,
    selectedLineId,
    dialogueLines,
    addTextBox,
    updateDialogueLine,
    currentPageIndex,
    setDialogueStatus,
    stylePresets,
    addStylePreset,
    removeStylePreset,
    applyPresetToTextBox,
    applyPresetAsDefault,
  } = useProjectStore()

  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')

  const selectedTextBox = textBoxes.find((t) => t.id === selectedTextBoxId)
  const selectedLine = dialogueLines.find((l) => l.id === selectedLineId)

  const currentStyle: TextBoxStyle = selectedTextBox?.style || defaultStyle
  const isEditingTextBox = !!selectedTextBox

  const handleStyleChange = (key: keyof TextBoxStyle, value: string | number | boolean) => {
    if (isEditingTextBox && selectedTextBoxId) {
      updateTextBox(selectedTextBoxId, {
        style: { ...currentStyle, [key]: value },
      })
    } else {
      setDefaultStyle({ [key]: value } as Partial<TextBoxStyle>)
    }
  }

  const handleCreateTextBox = () => {
    if (!selectedLine) return

    const textBoxId = addTextBox({
      pageIndex: currentPageIndex,
      x: 100,
      y: 100,
      width: 150,
      height: 60,
      text: selectedLine.text,
      style: { ...defaultStyle },
    })

    updateDialogueLine(selectedLine.id, { textBoxId })
    setDialogueStatus(selectedLine.id, 'embedded')
    useProjectStore.getState().selectTextBox(textBoxId)
  }

  const handleApplyPreset = (presetId: string) => {
    if (isEditingTextBox && selectedTextBoxId) {
      applyPresetToTextBox(selectedTextBoxId, presetId)
    } else {
      applyPresetAsDefault(presetId)
    }
  }

  const handleSaveAsPreset = () => {
    const name = newPresetName.trim()
    if (!name) return
    addStylePreset(name, currentStyle)
    setNewPresetName('')
    setShowSaveDialog(false)
  }

  const builtInList = stylePresets.filter((p) => p.isBuiltIn)
  const customList = stylePresets.filter((p) => !p.isBuiltIn)

  const presetStyleKey = (s: TextBoxStyle) =>
    `${s.fontFamily}|${s.fontSize}|${s.lineHeight}|${s.fillColor}|${s.strokeColor}|${s.strokeWidth}|${s.bold}|${s.italic}|${s.isVertical}`

  const currentKey = presetStyleKey(currentStyle)

  return (
    <div className="style-panel">
      <div className="panel-header">
        <h3>
          <Settings size={16} />
          {isEditingTextBox ? '文字框样式' : '默认样式'}
        </h3>
      </div>

      <div className="style-section">
        <div className="section-title">
          <BookMarked size={14} />
          样式预设
        </div>

        <div className="presets-toolbar">
          <button
            className="preset-save-btn"
            onClick={() => setShowSaveDialog(true)}
            title="保存当前样式为自定义预设"
          >
            <Save size={12} />
            保存预设
          </button>
        </div>

        {showSaveDialog && (
          <div className="preset-save-dialog">
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveAsPreset()}
              placeholder="预设名称..."
              autoFocus
            />
            <div className="dialog-actions">
              <button className="dialog-btn ok" onClick={handleSaveAsPreset}>
                <Check size={12} />
              </button>
              <button className="dialog-btn cancel" onClick={() => setShowSaveDialog(false)}>
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        <div className="presets-group">
          <div className="presets-group-label">内置</div>
          <div className="presets-list">
            {builtInList.map((preset) => (
              <button
                key={preset.id}
                className={`preset-chip ${presetStyleKey(preset.style) === currentKey ? 'active' : ''}`}
                onClick={() => handleApplyPreset(preset.id)}
                title={`应用预设：${preset.name}`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {customList.length > 0 && (
          <div className="presets-group">
            <div className="presets-group-label">自定义</div>
            <div className="presets-list">
              {customList.map((preset) => (
                <div
                  key={preset.id}
                  className={`preset-chip custom ${presetStyleKey(preset.style) === currentKey ? 'active' : ''}`}
                  title={preset.name}
                >
                  <button
                    className="preset-chip-apply"
                    onClick={() => handleApplyPreset(preset.id)}
                  >
                    {preset.name}
                  </button>
                  <button
                    className="preset-chip-delete"
                    onClick={() => removeStylePreset(preset.id)}
                    title="删除预设"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="presets-hint">
          {isEditingTextBox
            ? '应用到当前文字框；未选中框时设为默认样式'
            : '所有新建文字框将使用默认样式'}
        </div>
      </div>

      <div className="style-section">
        <div className="section-title">
          <Type size={14} />
          字体
        </div>

        <div className="style-item">
          <label>字体</label>
          <select
            value={currentStyle.fontFamily}
            onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
          >
            {fontFamilies.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </div>

        <div className="style-item">
          <label>字号</label>
          <div className="input-with-unit">
            <input
              type="number"
              value={currentStyle.fontSize}
              onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value) || 12)}
              min={8}
              max={100}
            />
            <span className="unit">px</span>
          </div>
        </div>

        <div className="style-item">
          <label>行距</label>
          <div className="input-with-unit">
            <input
              type="number"
              value={currentStyle.lineHeight}
              onChange={(e) => handleStyleChange('lineHeight', parseFloat(e.target.value) || 1)}
              min={0.8}
              max={3}
              step={0.1}
            />
            <span className="unit">倍</span>
          </div>
        </div>

        <div className="style-item checkbox-item">
          <label>
            <input
              type="checkbox"
              checked={currentStyle.bold}
              onChange={(e) => handleStyleChange('bold', e.target.checked)}
            />
            粗体
          </label>
          <label>
            <input
              type="checkbox"
              checked={currentStyle.italic}
              onChange={(e) => handleStyleChange('italic', e.target.checked)}
            />
            斜体
          </label>
        </div>

        <div className="style-item checkbox-item">
          <label>
            <input
              type="checkbox"
              checked={currentStyle.isVertical}
              onChange={(e) => handleStyleChange('isVertical', e.target.checked)}
            />
            竖排
          </label>
        </div>
      </div>

      <div className="style-section">
        <div className="section-title">
          <Palette size={14} />
          颜色
        </div>

        <div className="style-item">
          <label>文字颜色</label>
          <div className="color-input">
            <input
              type="color"
              value={currentStyle.fillColor}
              onChange={(e) => handleStyleChange('fillColor', e.target.value)}
            />
            <input
              type="text"
              value={currentStyle.fillColor}
              onChange={(e) => handleStyleChange('fillColor', e.target.value)}
              className="color-text"
            />
          </div>
        </div>

        <div className="style-item">
          <label>描边颜色</label>
          <div className="color-input">
            <input
              type="color"
              value={currentStyle.strokeColor}
              onChange={(e) => handleStyleChange('strokeColor', e.target.value)}
            />
            <input
              type="text"
              value={currentStyle.strokeColor}
              onChange={(e) => handleStyleChange('strokeColor', e.target.value)}
              className="color-text"
            />
          </div>
        </div>

        <div className="style-item">
          <label>描边宽度</label>
          <div className="input-with-unit">
            <input
              type="number"
              value={currentStyle.strokeWidth}
              onChange={(e) => handleStyleChange('strokeWidth', parseInt(e.target.value) || 0)}
              min={0}
              max={20}
            />
            <span className="unit">px</span>
          </div>
        </div>
      </div>

      {isEditingTextBox && (
        <div className="style-section">
          <div className="section-title">
            <AlignLeft size={14} />
            位置大小
          </div>

          <div className="style-item">
            <label>X 坐标</label>
            <div className="input-with-unit">
              <input
                type="number"
                value={Math.round(selectedTextBox?.x || 0)}
                onChange={(e) => {
                  if (selectedTextBoxId) {
                    updateTextBox(selectedTextBoxId, { x: parseInt(e.target.value) || 0 })
                  }
                }}
              />
              <span className="unit">px</span>
            </div>
          </div>

          <div className="style-item">
            <label>Y 坐标</label>
            <div className="input-with-unit">
              <input
                type="number"
                value={Math.round(selectedTextBox?.y || 0)}
                onChange={(e) => {
                  if (selectedTextBoxId) {
                    updateTextBox(selectedTextBoxId, { y: parseInt(e.target.value) || 0 })
                  }
                }}
              />
              <span className="unit">px</span>
            </div>
          </div>

          <div className="style-item">
            <label>宽度</label>
            <div className="input-with-unit">
              <input
                type="number"
                value={Math.round(selectedTextBox?.width || 0)}
                onChange={(e) => {
                  if (selectedTextBoxId) {
                    updateTextBox(selectedTextBoxId, { width: parseInt(e.target.value) || 1 })
                  }
                }}
                min={20}
              />
              <span className="unit">px</span>
            </div>
          </div>

          <div className="style-item">
            <label>高度</label>
            <div className="input-with-unit">
              <input
                type="number"
                value={Math.round(selectedTextBox?.height || 0)}
                onChange={(e) => {
                  if (selectedTextBoxId) {
                    updateTextBox(selectedTextBoxId, { height: parseInt(e.target.value) || 1 })
                  }
                }}
                min={20}
              />
              <span className="unit">px</span>
            </div>
          </div>
        </div>
      )}

      {selectedLine && !selectedLine.textBoxId && (
        <div className="action-section">
          <button className="create-btn" onClick={handleCreateTextBox}>
            创建文字框
          </button>
        </div>
      )}
    </div>
  )
}
