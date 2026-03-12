import { ImgHTMLAttributes } from 'react';
export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    const { className, ...rest } = props;
    return <img src="/logo-sidebar.svg" alt="Energía Monitor" className={className || 'size-8'} {...rest} />;
}
