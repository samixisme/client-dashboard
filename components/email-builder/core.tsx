import { z } from 'zod'
import { Avatar, AvatarPropsSchema } from '@usewaypoint/block-avatar'
import { Button, ButtonPropsSchema } from '@usewaypoint/block-button'
import { Divider, DividerPropsSchema } from '@usewaypoint/block-divider'
import { Heading, HeadingPropsSchema } from '@usewaypoint/block-heading'
import { Html, HtmlPropsSchema } from '@usewaypoint/block-html'
import { Image, ImagePropsSchema } from '@usewaypoint/block-image'
import { Spacer, SpacerPropsSchema } from '@usewaypoint/block-spacer'
import { Text, TextPropsSchema } from '@usewaypoint/block-text'
import {
  buildBlockComponent,
  buildBlockConfigurationDictionary,
  buildBlockConfigurationSchema,
} from '@usewaypoint/document-core'

import ColumnsContainerEditor from './blocks/ColumnsContainerEditor'
import ColumnsContainerPropsSchema from './blocks/ColumnsContainerPropsSchema'
import ContainerEditor from './blocks/ContainerEditor'
import ContainerPropsSchema from './blocks/ContainerPropsSchema'
import EmailLayoutEditor from './blocks/EmailLayoutEditor'
import EmailLayoutPropsSchema from './blocks/EmailLayoutPropsSchema'
import EditorBlockWrapper from './EditorBlockWrapper'

const EDITOR_DICTIONARY = buildBlockConfigurationDictionary({
  Avatar: {
    schema: AvatarPropsSchema,
    Component: (props: z.infer<typeof AvatarPropsSchema>) => (
      <EditorBlockWrapper>
        <Avatar {...props} />
      </EditorBlockWrapper>
    ),
  },
  Button: {
    schema: ButtonPropsSchema,
    Component: (props: z.infer<typeof ButtonPropsSchema>) => (
      <EditorBlockWrapper>
        <Button {...props} />
      </EditorBlockWrapper>
    ),
  },
  Container: {
    schema: ContainerPropsSchema,
    Component: (props: z.infer<typeof ContainerPropsSchema>) => (
      <EditorBlockWrapper>
        <ContainerEditor {...props} />
      </EditorBlockWrapper>
    ),
  },
  ColumnsContainer: {
    schema: ColumnsContainerPropsSchema,
    Component: (props: z.infer<typeof ColumnsContainerPropsSchema>) => (
      <EditorBlockWrapper>
        <ColumnsContainerEditor {...props} />
      </EditorBlockWrapper>
    ),
  },
  Heading: {
    schema: HeadingPropsSchema,
    Component: (props: z.infer<typeof HeadingPropsSchema>) => (
      <EditorBlockWrapper>
        <Heading {...props} />
      </EditorBlockWrapper>
    ),
  },
  Html: {
    schema: HtmlPropsSchema,
    Component: (props: z.infer<typeof HtmlPropsSchema>) => (
      <EditorBlockWrapper>
        <Html {...props} />
      </EditorBlockWrapper>
    ),
  },
  Image: {
    schema: ImagePropsSchema,
    Component: (data: z.infer<typeof ImagePropsSchema>) => {
      const props = {
        ...data,
        props: {
          ...data.props,
          url: data.props?.url ?? 'https://placehold.co/600x400@2x/F8F8F8/CCC?text=Your%20image',
        },
      }
      return (
        <EditorBlockWrapper>
          <Image {...props} />
        </EditorBlockWrapper>
      )
    },
  },
  Text: {
    schema: TextPropsSchema,
    Component: (props: z.infer<typeof TextPropsSchema>) => (
      <EditorBlockWrapper>
        <Text {...props} />
      </EditorBlockWrapper>
    ),
  },
  EmailLayout: {
    schema: EmailLayoutPropsSchema,
    Component: (p: z.infer<typeof EmailLayoutPropsSchema>) => <EmailLayoutEditor {...p} />,
  },
  Spacer: {
    schema: SpacerPropsSchema,
    Component: (props: z.infer<typeof SpacerPropsSchema>) => (
      <EditorBlockWrapper>
        <Spacer {...props} />
      </EditorBlockWrapper>
    ),
  },
  Divider: {
    schema: DividerPropsSchema,
    Component: (props: z.infer<typeof DividerPropsSchema>) => (
      <EditorBlockWrapper>
        <Divider {...props} />
      </EditorBlockWrapper>
    ),
  },
})

export const EditorBlock = buildBlockComponent(EDITOR_DICTIONARY)
export const EditorBlockSchema = buildBlockConfigurationSchema(EDITOR_DICTIONARY)
export const EditorConfigurationSchema = z.record(z.string(), EditorBlockSchema)

export type TEditorBlock = z.infer<typeof EditorBlockSchema>
export type TEditorConfiguration = Record<string, TEditorBlock>
