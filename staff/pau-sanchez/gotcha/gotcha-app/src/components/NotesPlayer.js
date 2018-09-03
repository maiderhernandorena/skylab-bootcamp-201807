import React, {Component} from 'react';
//import {Container, ListGroup, ListGroupItem, Button, FormGroup, FormControl, ControlLabel} from 'reactstrap';
import ReactPlayer from 'react-player'



class NotesPlayer extends Component {
    state = {
        items: [
            
        ],
        notes:[],
        url: null ,
        videoSlugId: '',
        playing: true,
        volume: 0.8,
        muted: false,
        played: 0,
        loaded: 0,
        duration: 0,
        playbackRate: 1.0,
        loop: false,
        newNoteTitle: '',
        newNoteText: '',
        newNoteSeconds: '',
        videoTitle:'',
        noteBookId: '',
    }

    static getDerivedStateFromProps(props) {
      //if(props.passUrl) {
        return {
          url: props.passUrl
        }
      //}
    }

   // componentWillMount = () => {
     // this.setUrl()
    //}

    setUrl = () => {
      this.setState({ url: this.props.passUrl})
      
    }
                    
  

    load = url => {
        this.setState({
          url,
          played: 0,
          loaded: 0
        })
      }
      playPause = () => {
        this.setState({ playing: !this.state.playing })
      }
      stop = () => {
        this.setState({ url: null, playing: false })
      }
      toggleLoop = () => {
        this.setState({ loop: !this.state.loop })
      }
      setVolume = e => {
        this.setState({ volume: parseFloat(e.target.value) })
      }
      toggleMuted = () => {
        this.setState({ muted: !this.state.muted })
      }
      setPlaybackRate = e => {
        this.setState({ playbackRate: parseFloat(e.target.value) })
      }
      onPlay = () => {
        console.log('onPlay')
        this.setState({ playing: true })
      }
      onPause = () => {
        console.log('onPause')
        this.setState({ playing: false })
      }
      onSeekMouseDown = e => {
        this.setState({ seeking: true })
      }
      onSeekChange = e => {
        this.setState({ played: parseFloat(e.target.value) })
      }
      onSeekMouseUp = e => {
        this.setState({ seeking: false })
        this.player.seekTo(parseFloat(e.target.value))
      }
      onProgress = state => {
        console.log('onProgress', state)
        // We only want to update time slider if we are not currently seeking
        if (!this.state.seeking) {
          this.setState(state)
          this.props.secondsPass(state)
        }
      }
      onEnded = () => {
        console.log('onEnded')
        this.setState({ playing: this.state.loop })
      }
      onDuration = (duration) => {
        console.log('onDuration', duration)
        this.setState({ duration })
      }
      
      renderLoadButton = (url, label) => {
        return (
          <button onClick={() => this.load(url)}>
            {label}
          </button>
        )
      }
      ref = player => {
        this.player = player
      }

      

      

          


    /////////////////////////////////////////

    render () {
        const {items, notes} = this.state;
        const { url, playing, volume, muted, loop, played, loaded, duration, playbackRate } = this.state
        const SEPARATOR = ' · '
        return(
            <div>
                <div className='app'>
          <section className='section'>
           
            <div className='player-wrapper'>
              <ReactPlayer
                ref={this.ref}
                width='100%'
                height='100%'
                url={url}
                playing={playing}
                loop={loop}
                playbackRate={playbackRate}
                volume={volume}
                muted={muted}
                onReady={() => console.log('onReady')}
                onStart={() => console.log('onStart')}
                onPlay={this.onPlay}
                onPause={this.onPause}
                onBuffer={() => console.log('onBuffer')}
                onSeek={e => console.log('onSeek', e)}
                onEnded={this.onEnded}
                onError={e => console.log('onError', e)}
                onProgress={this.onProgress}
                onDuration={this.onDuration}
              />
            </div>
  
            <table><tbody>
              <tr>
                <p>{this.state.videoTitle}</p>  
                <th>Controls</th>
                <td>
                  <button onClick={this.stop}>Stop</button>
                  <button onClick={this.playPause}>{playing ? 'Pause' : 'Play'}</button>
                  <button onClick={this.onClickFullscreen}>Fullscreen</button>
                  <button onClick={this.setPlaybackRate} value={1}>1</button>
                  <button onClick={this.setPlaybackRate} value={1.5}>1.5</button>
                  <button onClick={this.setPlaybackRate} value={2}>2</button>
                </td>
              </tr>
              <tr>
                <th>Seek</th>
                <td>
                  <input
                    type='range' min={0} max={1} step='any'
                    value={played}
                    onMouseDown={this.onSeekMouseDown}
                    onChange={this.onSeekChange}
                    onMouseUp={this.onSeekMouseUp}
                  />
                </td>
              </tr>
              <tr>
                <th>Volume</th>
                <td>
                  <input type='range' min={0} max={1} step='any' value={volume} onChange={this.setVolume} />
                </td>
              </tr>
              <tr>
                <th>
                  <label htmlFor='muted'>Muted</label>
                </th>
                <td>
                  <input id='muted' type='checkbox' checked={muted} onChange={this.toggleMuted} />
                </td>
              </tr>
              <tr>
                <th>
                  <label htmlFor='loop'>Loop</label>
                </th>
                <td>
                  <input id='loop' type='checkbox' checked={loop} onChange={this.toggleLoop} />
                </td>
              </tr>
              <tr>
                <th>Played</th>
                <td><progress max={1} value={played} /></td>
              </tr>
              <tr>
                <th>Loaded</th>
                <td><progress max={1} value={loaded} /></td>
              </tr>
            </tbody></table>
          </section>
          <section className='section'>
            <table><tbody>
              <tr>
                <th>YouTube</th>
                <td>
                  {this.renderLoadButton('https://www.youtube.com/watch?v=oUFJJNQGwhk', 'Test A')}
                  {this.renderLoadButton('https://www.youtube.com/watch?v=jNgP6d9HraI', 'Test B')}
                </td>
              </tr>
              
              <tr>
                <th>Custom URL</th>
                <td>
                  <input ref={input => { this.urlInput = input }} type='text' placeholder='Enter URL' />
                  <button onClick={() => {
                        const url = this.urlInput.value
                        this.setState({ url: this.urlInput.value })
                        //this.onLoadVideo(url)
                        
                    }
                      
                      }>Load</button>
                </td>
              </tr>
            </tbody></table>
  
            <h2>Form Notes</h2>
                    
                    <button onClick={() => {this.openNote()}}>Take Note</button>
                    <button onClick={() => {this.setUrl()}}>Seturl</button>
          </section>
          
        </div>
        </div>      
                
                

                
        )
    }

}

export default NotesPlayer;
