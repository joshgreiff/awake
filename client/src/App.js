import React, { useState } from 'react';
import './App.css';
import './output.css';
import { ApolloProvider, ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context'


// import Landing from './components/Landing';
import Nav from './components/Nav';
import Home from './components/Homepage';
import Shop from './components/Shop';
import Quests from './components/Quests';
import Check from './components/Check-in';
import Post from './pages/Posts';
import Sign from './components/Sign-up';
import Log from './components/Log-in';
import Profile from './components/Profile'
// import Hero from './components/Hero';
import Dashboard from './pages/Dashboard'
import AvatarCreator from './pages/CreateAvatar'
import { ReactDOM } from 'react-dom/client';
import {  BrowserRouter,  Routes,  Route, } from "react-router-dom";
import CreateAvatar from './pages/CreateAvatar';


const httpLink = createHttpLink({
  uri: '/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('id_token')
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  }
})

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});


function App() {
    const [navView, navViewToggle] = useState('!hidden')
    const [hamburegerView, hamburegerViewToggle] = useState('')
    const [xView, xViewToggle] = useState('hidden')
    const [animate, animateToggle] = useState('')
    const [pageView, setPageView] = useState('')
    const [logoView, setLogoView] = useState('')
    const [navContainerView, setNavContainerView] = useState('')


    const closeMenu = function (event) {
            animateToggle('origin-top animate-close-menu')
            setTimeout(() => {
                navViewToggle('!hidden')
                setPageView('')
                hamburegerViewToggle('')
                xViewToggle('hidden')
                setLogoView('block')
                setNavContainerView('')
            }, 501)
        }

    const openMenu = function() {
        animateToggle('origin-top animate-open-menu')
        navViewToggle('flex flex-col absolute top-[20%] left-[38%] items-center')
        setPageView('hidden')
        hamburegerViewToggle('hidden')
        xViewToggle('block')
        setLogoView('hidden')
        setNavContainerView('h-100vh')
    }

    const toggleMenu = function(){
        if(xView === '' || xView === 'hidden') {
            openMenu()
        }else if(hamburegerView ==='hidden'){
            closeMenu()
        }
    }

  return (

    <ApolloProvider client={client}>

        <Nav 
        navView = {navView}
        hamburegerView = {hamburegerView}
        xView = {xView}
        animate = {animate}
        pageView = {pageView}
        logoView = {logoView}
        toggleMenu = {toggleMenu}
        navContainerView = {navContainerView}
        />
        <div className={`container ${pageView}`}>
          <Routes>
            <Route path="/" element= {<Home />} />
            <Route path="/Shop" element= {<Shop />} />
            <Route path="/Quests" element= {<Quests />}>
            <Route path=":username" element= {<Quests />} />
            </Route>
            <Route path="/Check" element= {<Check />} />
            <Route path="/Social" element= {<Post />} />
            <Route path="/Signup" element= {<Sign />} />
            <Route path="/Login" element= {<Log />} />
            <Route path="/profile" element = {<Profile />} />
            <Route path='/dashboard' element={<Dashboard />} />
            <Route path='/create-avatar' element={<CreateAvatar />} />

            {/* <Route path="/landing" element = {<Landing />} /> */}
          </Routes>
        </div>
      </ApolloProvider>


  )
}

export default App;
