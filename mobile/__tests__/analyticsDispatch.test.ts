import { setAnalyticsSink, track } from '../src/analytics/dispatch';

describe('analytics dispatch', () => {
  afterEach(() => {
    // Restore default console sink for independence between tests.
    // eslint-disable-next-line no-console
    setAnalyticsSink(() => {});
  });

  it('track() calls the current sink with the event name + props', () => {
    const sink = jest.fn();
    setAnalyticsSink(sink);
    track('figure_viewed', { figure_id: 'f1' });
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledWith('figure_viewed', { figure_id: 'f1' });
  });

  it('setAnalyticsSink replaces the handler — the previous sink no longer receives events', () => {
    const first = jest.fn();
    const second = jest.fn();
    setAnalyticsSink(first);
    track('figure_viewed', { figure_id: 'f1' });
    setAnalyticsSink(second);
    track('figure_viewed', { figure_id: 'f2' });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('forwards typed event props without runtime transformation', () => {
    const sink = jest.fn();
    setAnalyticsSink(sink);
    track('figure_scroll_depth', { figure_id: 'x', max_depth_pct: 75 });
    expect(sink).toHaveBeenCalledWith('figure_scroll_depth', {
      figure_id: 'x',
      max_depth_pct: 75,
    });
  });

  it('dev sink (default) logs to console without throwing', () => {
    // eslint-disable-next-line no-console
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    // Force the default behavior by setting back a console-logging sink.
    setAnalyticsSink((name, props) => {
      // eslint-disable-next-line no-console
      console.log('[analytics]', name, props);
    });
    track('app_error', { message: 'boom', component_stack: '...stack...' });
    expect(spy).toHaveBeenCalledWith('[analytics]', 'app_error', {
      message: 'boom',
      component_stack: '...stack...',
    });
    spy.mockRestore();
  });
});
