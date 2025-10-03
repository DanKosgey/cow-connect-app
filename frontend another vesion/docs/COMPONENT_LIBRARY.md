# Component Library Documentation

This document provides comprehensive documentation for all reusable UI components in the DairyChain Pro application. Each component includes props documentation, usage examples, variants, and accessibility notes.

## Table of Contents

1. [Design Tokens](#design-tokens)
2. [Components](#components)
   - [Accordion](#accordion)
   - [Alert](#alert)
   - [Alert Dialog](#alert-dialog)
   - [Avatar](#avatar)
   - [Badge](#badge)
   - [Button](#button)
   - [Card](#card)
   - [Checkbox](#checkbox)
   - [Dialog](#dialog)
   - [Input](#input)
   - [Label](#label)
   - [Progress](#progress)
   - [Select](#select)
   - [Separator](#separator)
   - [Skeleton](#skeleton)
   - [Switch](#switch)
   - [Tabs](#tabs)
   - [Textarea](#textarea)
   - [Toast](#toast)
3. [Contribution Guidelines](#contribution-guidelines)

## Design Tokens

### Colors

| Color Name | Light Mode | Dark Mode | Usage |
|------------|------------|-----------|-------|
| Primary | `hsl(142, 55%, 45%)` | `hsl(142, 55%, 45%)` | Main brand color, primary actions |
| Primary Foreground | `hsl(142, 30%, 98%)` | `hsl(142, 30%, 98%)` | Text on primary background |
| Secondary | `hsl(142, 40%, 40%)` | `hsl(142, 40%, 40%)` | Secondary actions, accents |
| Secondary Foreground | `hsl(142, 30%, 98%)` | `hsl(142, 30%, 98%)` | Text on secondary background |
| Background | `hsl(142, 30%, 95%)` | `hsl(142, 30%, 15%)` | Page background |
| Foreground | `hsl(142, 30%, 10%)` | `hsl(142, 30%, 98%)` | Primary text color |
| Muted | `hsl(142, 20%, 90%)` | `hsl(142, 20%, 25%)` | Subtle backgrounds, disabled states |
| Muted Foreground | `hsl(142, 20%, 40%)` | `hsl(142, 20%, 70%)` | Secondary text |
| Border | `hsl(142, 30%, 85%)` | `hsl(142, 30%, 25%)` | Borders, dividers |
| Success | `#16a34a` | `#16a34a` | Success states, positive feedback |
| Error | `#dc2626` | `#f87171` | Error states, destructive actions |
| Warning | `#f59e0b` | `#fbbf24` | Warning states, cautionary feedback |
| Info | `#3b82f6` | `#3b82f6` | Informational messages |

### Typography Scale

| Variable | Value | Pixels | Usage |
|----------|-------|--------|-------|
| `--text-xs` | clamp(0.75rem, 1.5vw, 0.875rem) | 12px-14px | Overlines, small text |
| `--text-sm` | clamp(0.875rem, 2vw, 1rem) | 14px-16px | Captions, secondary text |
| `--text-base` | clamp(1rem, 2.5vw, 1.125rem) | 16px-18px | Body text, default size |
| `--text-lg` | clamp(1.125rem, 3vw, 1.25rem) | 18px-20px | Lead paragraphs |
| `--text-xl` | clamp(1.25rem, 3.5vw, 1.5rem) | 20px-24px | H4 headings |
| `--text-2xl` | clamp(1.5rem, 4vw, 1.875rem) | 24px-30px | H3 headings |
| `--text-3xl` | clamp(1.875rem, 5vw, 2.25rem) | 30px-36px | H2 headings |
| `--text-4xl` | clamp(2.25rem, 6vw, 3rem) | 36px-48px | H1 headings |

### Spacing Scale

| Scale Name | Value | Pixels | Usage |
|------------|-------|--------|-------|
| `xs` | 0.25rem | 4px | Minimal spacing |
| `sm` | 0.5rem | 8px | Small spacing |
| `md` | 1rem | 16px | Default spacing |
| `lg` | 1.5rem | 24px | Large spacing |
| `xl` | 2rem | 32px | Extra large spacing |
| `2xl` | 3rem | 48px | Double extra large |
| `3xl` | 4rem | 64px | Triple extra large |

### Border Radius

| Scale Name | Value | Usage |
|------------|-------|-------|
| `sm` | calc(var(--radius) - 4px) | Small rounded corners |
| `md` | calc(var(--radius) - 2px) | Medium rounded corners |
| `lg` | var(--radius) | Large rounded corners |
| `full` | 9999px | Circular elements |

## Components

### Accordion

A vertically stacked set of interactive headings that each reveal a section of content.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| type | "single" \| "multiple" | "single" | Determines whether one or multiple items can be open at the same time |
| collapsible | boolean | false | When type is "single", allows closing content when clicking trigger for an open item |
| disabled | boolean | false | Disables the accordion |
| defaultValue | string \| string[] | - | The value of the item to expand when initially rendered |
| value | string \| string[] | - | The controlled value of the open item(s) |
| onValueChange | (value: string \| string[]) => void | - | Event handler called when the value changes |

#### Basic Usage

```jsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export function AccordionDemo() {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>
          Yes. It adheres to the WAI-ARIA design pattern.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
```

#### Variants

- **Single**: Only one item can be open at a time
- **Multiple**: Multiple items can be open at the same time

#### Accessibility

- Full keyboard navigation support
- Proper ARIA attributes for screen readers
- Trigger elements are focusable and activatable via keyboard

---

### Alert

Displays a callout for user attention with optional title and description.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | "default" \| "destructive" | "default" | Style variant of the alert |

#### Basic Usage

```jsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"

export function AlertDemo() {
  return (
    <Alert>
      <Terminal className="h-4 w-4" />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can add components to your app using the cli.
      </AlertDescription>
    </Alert>
  )
}
```

#### Variants

- **Default**: Standard alert style
- **Destructive**: Error or warning style with red color scheme

#### Accessibility

- Proper semantic HTML structure
- Color contrast compliant with WCAG standards
- Icon-only alerts include proper ARIA labels

---

### Alert Dialog

A modal dialog that interrupts the user with important content and expects a response.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| open | boolean | false | Control the open state of the dialog |
| onOpenChange | (open: boolean) => void | - | Event handler called when the open state changes |
| defaultOpen | boolean | false | The open state of the dialog when it is initially rendered |

#### Basic Usage

```jsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export function AlertDialogDemo() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Show Dialog</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

#### Accessibility

- Full keyboard navigation support
- Proper focus management
- Screen reader announcements for modal state changes
- Escape key to close the dialog

---

### Avatar

An image element with a fallback for representing the user.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| src | string | - | The source URL of the avatar image |
| alt | string | - | Alt text for the image |
| fallback | React.ReactNode | - | Fallback content to display when image fails to load |

#### Basic Usage

```jsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function AvatarDemo() {
  return (
    <Avatar>
      <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  )
}
```

#### Accessibility

- Proper alt text handling
- Focusable when interactive
- ARIA attributes for screen readers

---

### Badge

Displays a badge or a component that looks like a badge.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | "default" \| "secondary" \| "destructive" \| "outline" | "default" | Style variant of the badge |

#### Basic Usage

```jsx
import { Badge } from "@/components/ui/badge"

export function BadgeDemo() {
  return <Badge>Badge</Badge>
}
```

#### Variants

- **Default**: Primary brand color
- **Secondary**: Secondary color scheme
- **Destructive**: Error/warning color scheme
- **Outline**: Border-only style

#### Accessibility

- Proper color contrast ratios
- Semantic HTML structure
- Screen reader compatible

---

### Button

Displays a button or a component that looks like a button.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | "default" \| "destructive" \| "outline" \| "secondary" \| "ghost" \| "link" | "default" | Style variant of the button |
| size | "default" \| "sm" \| "lg" \| "icon" | "default" | Size of the button |
| disabled | boolean | false | Disables the button |
| asChild | boolean | false | Change the component to the one passed as a child |

#### Basic Usage

```jsx
import { Button } from "@/components/ui/button"

export function ButtonDemo() {
  return <Button>Button</Button>
}
```

#### Variants

- **Default**: Primary action button
- **Destructive**: Error or destructive action
- **Outline**: Border-only style
- **Secondary**: Secondary action
- **Ghost**: Minimal style with hover effect
- **Link**: Text-like button

#### Sizes

- **Default**: Standard size
- **sm**: Small size
- **lg**: Large size
- **icon**: Icon-only button

#### Accessibility

- Proper focus states
- Keyboard navigation support
- ARIA attributes for screen readers
- Color contrast compliance

---

### Card

Displays a card with header, content, and footer.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | Additional CSS classes |

#### Basic Usage

```jsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function CardDemo() {
  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card Content</p>
      </CardContent>
      <CardFooter>
        <p>Card Footer</p>
      </CardFooter>
    </Card>
  )
}
```

#### Accessibility

- Semantic HTML structure
- Proper heading hierarchy
- Focus management for interactive elements

---

### Checkbox

A control that allows the user to toggle between checked and not checked.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| checked | boolean | - | The controlled checked state of the checkbox |
| defaultChecked | boolean | false | The checked state of the checkbox when it is initially rendered |
| onCheckedChange | (checked: boolean) => void | - | Event handler called when the checked state changes |
| disabled | boolean | false | Disables the checkbox |

#### Basic Usage

```jsx
import { Checkbox } from "@/components/ui/checkbox"

export function CheckboxDemo() {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <label
        htmlFor="terms"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Accept terms and conditions
      </label>
    </div>
  )
}
```

#### Accessibility

- Keyboard navigation support
- Proper ARIA attributes
- Focus indicators
- Screen reader announcements

---

### Dialog

A window overlaid on either the primary window or another dialog window, rendering the content underneath inert.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| open | boolean | false | Control the open state of the dialog |
| onOpenChange | (open: boolean) => void | - | Event handler called when the open state changes |
| defaultOpen | boolean | false | The open state of the dialog when it is initially rendered |

#### Basic Usage

```jsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function DialogDemo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Edit Profile</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input id="name" value="Pedro Duarte" className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

#### Accessibility

- Full keyboard navigation
- Proper focus management
- Screen reader announcements
- Escape key to close

---

### Input

Displays a form input field or a component that looks like an input field.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| type | string | "text" | Type of input element |
| value | string | - | The controlled value of the input |
| defaultValue | string | - | The value of the input when it is initially rendered |
| onChange | (event: React.ChangeEvent<HTMLInputElement>) => void | - | Event handler called when the value changes |
| disabled | boolean | false | Disables the input |
| placeholder | string | - | Placeholder text |

#### Basic Usage

```jsx
import { Input } from "@/components/ui/input"

export function InputDemo() {
  return <Input type="email" placeholder="Email" />
}
```

#### Accessibility

- Proper labeling support
- Focus states
- Keyboard navigation
- ARIA attributes

---

### Label

Renders an accessible label associated with controls.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| htmlFor | string | - | The id of the element the label is associated with |

#### Basic Usage

```jsx
import { Label } from "@/components/ui/label"

export function LabelDemo() {
  return (
    <div>
      <Label htmlFor="email">Email</Label>
      <Input type="email" id="email" placeholder="Enter your email" />
    </div>
  )
}
```

#### Accessibility

- Proper association with form controls
- Screen reader support
- Semantic HTML

---

### Progress

Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | number | 0 | The progress value between 0 and 100 |
| max | number | 100 | The maximum value of the progress bar |
| className | string | - | Additional CSS classes |

#### Basic Usage

```jsx
import { Progress } from "@/components/ui/progress"

export function ProgressDemo() {
  const [progress, setProgress] = React.useState(13)

  React.useEffect(() => {
    const timer = setTimeout(() => setProgress(66), 500)
    return () => clearTimeout(timer)
  }, [])

  return <Progress value={progress} className="w-[60%]" />
}
```

#### Accessibility

- Proper ARIA attributes for screen readers
- Color contrast compliant with WCAG standards
- Semantic HTML structure

---

### Select

Displays a list of options for the user to pick from—triggered by a button.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | string | - | The controlled value of the select |
| defaultValue | string | - | The value of the select when it is initially rendered |
| onValueChange | (value: string) => void | - | Event handler called when the value changes |
| open | boolean | - | Control the open state of the select |
| onOpenChange | (open: boolean) => void | - | Event handler called when the open state changes |
| disabled | boolean | false | Disables the select |

#### Basic Usage

```jsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function SelectDemo() {
  return (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="blueberry">Blueberry</SelectItem>
      </SelectContent>
    </Select>
  )
}
```

#### Variants

- **Default**: Standard select style
- **Disabled**: Disabled state with reduced opacity

#### Accessibility

- Full keyboard navigation support
- Proper ARIA attributes for screen readers
- Focus management
- Keyboard shortcuts (arrow keys, Enter, Escape)

---

### Separator

Visually or semantically separates content.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| orientation | "horizontal" \| "vertical" | "horizontal" | Orientation of the separator |
| decorative | boolean | true | Whether the separator is decorative or semantic |

#### Basic Usage

```jsx
import { Separator } from "@/components/ui/separator"

export function SeparatorDemo() {
  return (
    <div>
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">Radix Primitives</h4>
        <p className="text-sm text-muted-foreground">
          An open-source UI component library.
        </p>
      </div>
      <Separator className="my-4" />
      <div className="flex h-5 items-center space-x-4 text-sm">
        <div>Blog</div>
        <Separator orientation="vertical" />
        <div>Docs</div>
        <Separator orientation="vertical" />
        <div>Source</div>
      </div>
    </div>
  )
}
```

#### Accessibility

- Proper semantic HTML when not decorative
- Hidden from screen readers when decorative
- Correct orientation attributes

---

### Skeleton

Use to show a placeholder while content is loading.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | Additional CSS classes |

#### Basic Usage

```jsx
import { Skeleton } from "@/components/ui/skeleton"

export function SkeletonDemo() {
  return (
    <div className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  )
}
```

#### Accessibility

- Proper ARIA attributes for loading states
- Screen reader announcements for content loading
- Semantic HTML structure

---

### Switch

A control that allows the user to toggle between checked and not checked.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| checked | boolean | - | The controlled checked state of the switch |
| defaultChecked | boolean | false | The checked state of the switch when it is initially rendered |
| onCheckedChange | (checked: boolean) => void | - | Event handler called when the checked state changes |
| disabled | boolean | false | Disables the switch |

#### Basic Usage

```jsx
import { Switch } from "@/components/ui/switch"

export function SwitchDemo() {
  return (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Airplane Mode</Label>
    </div>
  )
}
```

#### Accessibility

- Full keyboard navigation support
- Proper ARIA attributes for screen readers
- Focus indicators
- Screen reader announcements

---

### Tabs

A set of layered sections of content—known as tab panels—that are displayed one at a time.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | string | - | The controlled value of the tab to activate |
| defaultValue | string | - | The value of the tab to activate when it is initially rendered |
| onValueChange | (value: string) => void | - | Event handler called when the value changes |
| orientation | "horizontal" \| "vertical" | "horizontal" | The orientation of the tabs |

#### Basic Usage

```jsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function TabsDemo() {
  return (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        Make changes to your account here.
      </TabsContent>
      <TabsContent value="password">
        Change your password here.
      </TabsContent>
    </Tabs>
  )
}
```

#### Accessibility

- Full keyboard navigation support
- Proper ARIA attributes for screen readers
- Focus management
- Keyboard shortcuts (arrow keys, Home, End)

---

### Textarea

Displays a form textarea or a component that looks like a textarea.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | string | - | The controlled value of the textarea |
| defaultValue | string | - | The value of the textarea when it is initially rendered |
| onChange | (event: React.ChangeEvent<HTMLTextAreaElement>) => void | - | Event handler called when the value changes |
| disabled | boolean | false | Disables the textarea |
| placeholder | string | - | Placeholder text |
| rows | number | - | Number of rows in the textarea |

#### Basic Usage

```jsx
import { Textarea } from "@/components/ui/textarea"

export function TextareaDemo() {
  return <Textarea placeholder="Type your message here." />
}
```

#### Accessibility

- Proper labeling support
- Focus states
- Keyboard navigation
- ARIA attributes

---

### Toast

A succinct message that is displayed temporarily.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | "default" \| "destructive" | "default" | Style variant of the toast |
| title | string | - | Title of the toast |
| description | string | - | Description of the toast |
| action | React.ReactNode | - | Action element to display in the toast |
| onOpenChange | (open: boolean) => void | - | Event handler called when the open state changes |

#### Basic Usage

```jsx
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

export function ToastDemo() {
  const { toast } = useToast()

  return (
    <Button
      variant="outline"
      onClick={() => {
        toast({
          title: "Scheduled: Catch up",
          description: "Friday, February 10, 2023 at 5:57 PM",
          action: (
            <ToastAction altText="Goto schedule to undo">Undo</ToastAction>
          ),
        })
      }}
    >
      Show Toast
    </Button>
  )
}
```

#### Variants

- **Default**: Standard toast style
- **Destructive**: Error or warning style with red color scheme

#### Accessibility

- Proper ARIA attributes for screen readers
- Focus management
- Keyboard navigation
- Automatic dismissal with option to persist

## Contribution Guidelines

To contribute a new component to the library:

1. Create the component in `src/components/ui/` following existing patterns
2. Ensure the component is accessible and follows WCAG guidelines
3. Document the component in this file with:
   - Props documentation
   - Basic usage example
   - Variants (if applicable)
   - Accessibility notes
4. Add the component to the Table of Contents
5. Test the component in storybook (if available) or create a demo page
6. Ensure the component follows the design tokens (colors, typography, spacing)

When updating existing components:

1. Maintain backward compatibility when possible
2. Update documentation when props or usage change
3. Test changes across different browsers and devices
4. Ensure accessibility is maintained or improved
