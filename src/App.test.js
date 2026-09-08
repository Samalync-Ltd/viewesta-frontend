import { render, screen } from '@testing-library/react';

function ViewStaSmokeTest() {
  return <div>ViewSta frontend is ready</div>;
}

test('renders the ViewSta frontend test environment', () => {
  render(<ViewStaSmokeTest />);

  expect(
    screen.getByText(/ViewSta frontend is ready/i)
  ).toBeInTheDocument();
});
