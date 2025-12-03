import { observer } from 'mobx-react-lite'
import { PhotoSlider } from 'react-photo-view'
import { useLocalState, useSubject } from '~/hooks/localState'
import { useStore } from '~/routes/chat/store/store'
export const PreviewImage = observer(() => {
  const store = useStore()
  const [state, setState] = useLocalState({
    visible: false,
    index: 0,
    images: [] as string[]
  })
  useSubject(store.openPreviewImages$, (images) => {
    setState({ images, index: 0, visible: true })
  })
  return (
    <PhotoSlider
      maskOpacity={0.5}
      images={state.images.map((src) => ({ src, key: src }))}
      visible={state.visible}
      onClose={() => setState({ visible: false, index: 0, images: [] })}
      index={state.index}
      onIndexChange={(i) => setState({ index: i })}
    />
  )
})
