export function EmptyFilesArea() {
    return (
        <div className='min-h-75 absolute inset-x-0 top-20 bottom-0 flex items-center text-gray-400 justify-center pb-50 md:pr-10 xl:pr-20'>
            <div><center>
                <p className='text-5xl font-bold mb-3'>Directory is empty</p>
                <p>Try uploading some files</p></center>
            </div>
        </div>
    );
}
