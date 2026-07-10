import { Link } from 'react-router-dom';

export default function Register() {
  return (
    <div className="text-center text-text">
      <p>Registration coming soon.</p>
      <Link to="/login" className="text-primary hover:text-primary-hover mt-4 block">Back to Login</Link>
    </div>
  );
}
