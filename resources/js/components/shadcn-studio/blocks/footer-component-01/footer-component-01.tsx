const Footer = () => {
  return (
    <footer>
      <div className='mx-auto flex max-w-7xl justify-center px-4 py-2 sm:px-6'>
        <p className='text-center font-medium text-balance'>
          {`©${new Date().getFullYear()}`} <a href='https://gsconecta.es' target='_blank' rel='noopener noreferrer'>GS Conecta</a>, Fet amb ❤️ per a una millor web.
        </p>
      </div>
    </footer>
  )
}

export default Footer
