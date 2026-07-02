// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import LoadingState from '../../src/components/LoadingState'

describe('LoadingState', () => {
  /**
   * 验证统一加载组件会展示传入文案，供页面级和局部加载态复用。
   */
  test('展示加载提示文案', () => {
    render(<LoadingState tip="加载学习数据..." />)

    expect(screen.getByText('加载学习数据...')).toBeTruthy()
  })
})
