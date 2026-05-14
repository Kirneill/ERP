import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HealthBadge } from './HealthBadge';

describe('HealthBadge', () => {
  it('renders accessible risk status labels', () => {
    render(<HealthBadge status="AtRisk" />);

    expect(screen.getByLabelText(/health status: at risk/i)).toBeInTheDocument();
    expect(screen.getByText(/at risk/i)).toBeInTheDocument();
  });
});
