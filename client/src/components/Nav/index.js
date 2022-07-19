import { Link, useMatch, useResolvedPath } from 'react-router-dom';
import logo from '../../assets/logo/awake.svg';
import Auth from '../../utils/auth'
import coin from '../../assets/coin/A -2.svg'

import { useQuery } from '@apollo/client'

import { QUERY_ME } from '../../utils/queries'

export default function Navbar() {
    const {loading, data } = useQuery(QUERY_ME)
  
// console.log(data)
    if(loading){
      return <h3>Loading</h3>
    }
    const logout = event => {
        event.preventDefault()
        Auth.logout()
    }
    return (
    <nav className="nav">
        <Link to="/">
            <img className="Awake" src={logo} alt="React logo"></img> 
        </Link>
        <ul>
            <CustomLink to="/Dashboard" className="font">Dashboard</CustomLink>
            <CustomLink to="/Social" className="font">Social</CustomLink>
            <CustomLink to="/Communities" className="font">Communities</CustomLink>
            <CustomLink to="/Shop" className="font">Shop</CustomLink>
        </ul>
        <ul>
            
            {Auth.loggedIn() ? (
            <>
              {/* <Link to ="/profile">Me</Link> */}
              <a href="/" onClick={logout} className="font">
                Logout
              </a>
              <div className='flex align-middle'>
<<<<<<< HEAD
                <img src={coin} width={30} className='bg-nav-grey' alt='awake-coin icon'/>
                <div className='pt-3 pl-1 text-black bg-nav-grey'>{data.me.coins}</div>
=======
                <img src={coin} width={30} className='bg-nav-grey'/>
                <div className='pt-3 pl-1 text-black bg-nav-grey font'>{data.me.coins}</div>
>>>>>>> edbefeb3927a68c33b494b5de509ce386b0de370
              </div>
              <div className='flex align-middle'>
                <div className='pt-3 pl-1 text-black bg-nav-grey font'>Level:</div>
                
                <div className='pt-3 pl-1 text-black bg-nav-grey font'>{data.me.level}</div>
              </div> 
            
            </>
          ) : (
            <>
                <Link to="/Login" className='font'>Login</Link>
                <Link to="/Signup" className='font'>Sign Up!</Link>
            </>
          )}
        </ul>
    </nav>

    )
}

function CustomLink({ to, children, ...props }) {
    const resolvedPath = useResolvedPath(to)
    const isActive = useMatch({ path: resolvedPath.pathname, end: true })
    return (
        <li className={isActive ? "active" : ""}>
            <Link to={to} {...props}>{children}</Link>
        </li>
    )
}