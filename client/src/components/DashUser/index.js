import React from "react";
import { AvatarCreatorViewer } from '@readyplayerme/rpm-react-sdk';

const DashUser = ({me}) => {
    const handleOnAvatarExported = (url) => {
        console.log(`Avatar URL is: ${url}`)
      }
    return (
        // <div className="user-dash-div">
        //     <div>
        //         <h3 className="text-black font-bold text-2xl py: 10 lg:underline lg:underline-offset-8 decoration-blue-900 decoration-2 lg:py-10 font">Hello, {me.username}</h3>
        //     </div>
        //     <div>
        //         <p className="text-black text-xl py-2 lg:py-6 font">You're currently level {me.level}</p>
        //     </div>
        //     <div>
        //         <p className="text-black text-xl py-2 lg:py-6 font">You have {me.coins} coins</p>
        //     </div>
        //     <div>
        //         <p className="text-black text-xl py-2 lg:py-6 font">You currently have {me.exp} experience points</p>
        //     </div>
        // </div>
        // <AvatarCreatorViewer 
        // subdomain="awaketechnology.readyplayer.me?frameApi" 
        // onAvatarExported={handleOnAvatarExported}/>
        <>
            <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.1.1/model-viewer.min.js"></script>
            <model-viewer id="modelviewer" alt="Ready Player Me Avatar"
        src="https://api.readyplayer.me/v1/avatars/6185a4acfb622cf1cdc49348.glb" shadow-intensity="1" camera-controls
        touch-action="pan-y">
            </model-viewer>
        </>
        
        )
}

export default DashUser