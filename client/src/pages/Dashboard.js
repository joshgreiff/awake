import React, { useState } from 'react';
import DashPosts from '../components/DashQuests';
import DashUser from '../components/DashUser';
import DashQuests from '../components/DashAttributes';


import Auth from '../utils/auth';
import { useQuery } from '@apollo/client';
import { Navigate } from 'react-router-dom'
import { AvatarCreatorViewer } from '@readyplayerme/rpm-react-sdk';
import { Avatar } from '@readyplayerme/visage';
import { QUERY_ME } from '../utils/queries';

import Modal from '../components/Quest-Modal'
import ModalPost from '../components/Post-Modal'
import CreateAvatar from '..'
const Dashboard = () => {
    const [openModal, setOpenModal] = useState(false)
    const [openModalPost, setOpenModalPost] = useState(false)

    const { loading, data } = useQuery(QUERY_ME);
    const loggedIn = Auth.loggedIn();
    
    const avatarConfig = {
        // meshLod: 2,
        // textureAtlas: 512,
        // morphTargets: 'ARKit',
        // pose: 'T',
      };


    if (!loggedIn) {
        return <Navigate to="/login" />
    }

    if(loading) {
        return <h3>Loading...</h3>
    }

    return (
        <>
        {openModal && <Modal closeModal={setOpenModal}/>}
        {openModalPost && <ModalPost closeModalPost={setOpenModalPost}/>}

        <div className="flex justify-center px-[10px] my-auto db-center dashboard ">
            
            <div className='quest-section bg-gray-400 text-center border-2 border-black bg-grey-400'>
                <button className='z-0 openModalBtn relative bg-blue-500 hover:bg-blue-600 rounded-lg overflow-hidden text-white px-3 py-2 group mt-1 font'
                        onClick={() => {
                            setOpenModal(true)
                        }}
                >New attribute</button>
                
                {loading ? (
                    <div>Loading...</div>
                ) : (
                    <DashQuests
                        quests={data.me.quests}
                        title='Your Quests:'
                    />
                )}
            </div>
            <div className="dashboard-rows">
                <div className='profile-section border-2 bg-gray-400 text-center border-black bg-gray-400'>
                    {loading ? (
                        <div>Loading...</div>
                    ) : (
                        <DashUser
                            me={data.me}
                        />
                        
                    )}
                </div>
                <div className='post-section border-2 bg-gray-400 text-center border-black bg-gray-400'>
                <button className='z-0 relative bg-blue-500 hover:bg-blue-600 rounded-lg overflow-hidden text-white px-3 py-2 group mt-1 font'
                    onClick={() => {
                        setOpenModalPost(true)
                    }}
                >New Quest</button>
                    {loading ? (
                        <div>Loading...</div>
                    ) : (
                        <DashPosts
                            posts={data.me.posts}
                            title='Your Posts:'
                        />
                    )}
                </div>
            </div>
        </div>
        {/* <Avatar modelSrc={'https://models.readyplayer.me/6185a4acfb622cf1cdc49348.glb'} avatarConfig={avatarConfig}/> */}
        </>
    )
}

export default Dashboard;